// routes/network.js
const express = require('express');
const router = express.Router();
const net = require('net');
const tls = require('tls');
const dns = require('dns').promises;
const rateLimit = require('express-rate-limit');

/**
 * Rate limiting (in-memory). In production behind a proxy, set:
 *   app.set('trust proxy', 1)
 * and consider a shared store (e.g., Redis).
 */
const scanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
router.use('/scan', scanLimiter);

// Default common ports to check
const DEFAULT_PORTS = [21, 22, 25, 53, 80, 110, 143, 443, 465, 587, 993, 995, 8080];

// Tunables
const CONNECT_TIMEOUT_MS = 800; // realistic TCP connect timeout
const RETRIES = 2;              // small retry count for confidence
const MAX_PORTS = 64;           // safety bound if custom ports are requested

// --- Helpers: validation & SSRF guards ---

function isIPv4(s) {
  return net.isIP(s) === 4;
}
function isIPv6(s) {
  return net.isIP(s) === 6;
}

/**
 * Returns true if the provided ip (string) is private/loopback/link-local/metadata and should be blocked.
 * Accepts both IPv4 and IPv6; uses net.isIP for validation.
 */
function isPrivateOrBlockedIP(ip) {
  if (!ip) return true;

  const kind = net.isIP(ip);
  if (kind === 4) {
    const parts = ip.split('.').map(n => Number(n));
    if (parts.length !== 4 || parts.some(p => Number.isNaN(p) || p < 0 || p > 255)) {
      return true; // weird/invalid IP -> be conservative and block
    }
    const [a, b] = parts;
    if (a === 127) return true;                            // loopback 127.0.0.0/8
    if (a === 10) return true;                             // 10.0.0.0/8
    if (a === 192 && b === 168) return true;               // 192.168.0.0/16
    if (a === 172 && b >= 16 && b <= 31) return true;      // 172.16.0.0/12
    if (a === 169 && b === 254) return true;               // link-local 169.254.0.0/16
    if (ip === '169.254.169.254') return true;             // common cloud metadata
    return false;
  }

  if (kind === 6) {
    const low = ip.toLowerCase();
    if (low === '::1') return true;                        // loopback
    if (low.startsWith('fe80:')) return true;              // link-local fe80::/10
    // Unique local addresses fc00::/7 (fc or fd prefix)
    if (low.startsWith('fc') || low.startsWith('fd')) return true;
    return false;
  }

  // Not an IP string (hostname) — caller should not call this with hostnames, but be conservative
  return true;
}

function parseCustomPorts(q) {
  if (!q) return null;
  try {
    const arr = q.split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(n => parseInt(n, 10))
      .filter(n => Number.isInteger(n) && n >= 1 && n <= 65535);

    const uniq = Array.from(new Set(arr));
    if (uniq.length === 0) return null;
    return uniq.slice(0, MAX_PORTS);
  } catch {
    return null;
  }
}

// --- Core TCP connect attempt ---
// Returns { port, status } where status is 'open' or 'closed'
//
// Behavior:
// - HTTP ports (80, 8080): connect, send HEAD, require "HTTP/" response to mark open.
// - HTTPS (443): TLS handshake (SNI) then send HEAD over TLS, require "HTTP/" response.
// - Non-HTTP ports: a port is 'open' only if either (a) the service sends a banner/data chunk
//   within the timeout, or (b) the TCP connection stays open past a short grace window (default 200ms).
// - Any error or timeout = treated as 'closed'.
function attemptConnection(port, host, timeoutMs = CONNECT_TIMEOUT_MS, hostnameForHeader = null) {
  return new Promise((resolve) => {
    let socket = null;
    let settled = false;

    // Fallback: in case nothing else resolves, ensure we mark closed
    const fallbackTimer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try { if (socket) socket.destroy(); } catch {}
        resolve({ port, status: 'closed' });
      }
    }, timeoutMs + 500);

    const finish = (status) => {
      if (settled) return;
      settled = true;
      clearTimeout(fallbackTimer);
      try { if (socket) socket.destroy(); } catch {}
      resolve({ port, status });
    };

    // Helper: send HEAD and expect HTTP/ response (used for 80/8080 and over TLS for 443)
    const performHttpProbe = (sock) => {
      const hostHeader = hostnameForHeader || host;
      const req = `HEAD / HTTP/1.0\r\nHost: ${hostHeader}\r\nConnection: close\r\n\r\n`;

      let got = false;
      const onData = (data) => {
        if (got) return;
        got = true;
        const s = data.toString();
        if (s.startsWith('HTTP/')) finish('open');
        else finish('closed');
      };
      const onErr = () => finish('closed');
      const onTimeout = () => finish('closed');

      sock.once('data', onData);
      sock.once('error', onErr);
      sock.once('timeout', onTimeout);

      try {
        sock.write(req);
      } catch (e) {
        finish('closed');
      }
    };

    // HTTPS (443): do TLS handshake (SNI) then HEAD
    if (port === 443) {
      const opts = {
        host,
        port: 443,
        servername: hostnameForHeader || host,
        rejectUnauthorized: false, // we only care about handshake + response
      };

      const tlsSocket = tls.connect(opts, () => {
        performHttpProbe(tlsSocket);
      });

      socket = tlsSocket;
      tlsSocket.setTimeout(timeoutMs);
      tlsSocket.once('error', () => finish('closed'));
      tlsSocket.once('timeout', () => finish('closed'));

      // In some rare cases 'end'/'close' may happen without data; fallback timer will handle it
      return;
    }

    // HTTP (80, 8080): connect then HEAD
    if (port === 80 || port === 8080) {
      const s = new net.Socket();
      socket = s;
      s.setNoDelay(true);
      s.setKeepAlive(false);
      s.setTimeout(timeoutMs);

      s.once('connect', () => performHttpProbe(s));
      s.once('error', () => finish('closed'));
      s.once('timeout', () => finish('closed'));

      try {
        s.connect({ port, host });
      } catch (err) {
        finish('closed');
      }
      return;
    }

    // Non-HTTP ports: require banner OR survive a short grace window after connect
    const s = new net.Socket();
    socket = s;
    s.setNoDelay(true);
    s.setKeepAlive(false);
    s.setTimeout(timeoutMs);

    let gotBanner = false;
    let closedBeforeGrace = false;

    // If service sends data (banner), that's a strong indicator it's open
    s.once('data', (buf) => {
      gotBanner = true;
      finish('open');
    });

    s.once('connect', () => {
      // short grace window to detect immediate close-then-reset behavior by middleboxes
      const graceMs = 200;
      const graceTimer = setTimeout(() => {
        if (!settled && !closedBeforeGrace) {
          // no immediate close and no banner -> consider open
          finish('open');
        }
      }, graceMs);

      // If connection closes before grace timer and we didn't get banner, treat as closed
      s.once('close', () => {
        clearTimeout(graceTimer);
        if (!gotBanner && !settled) {
          closedBeforeGrace = true;
          finish('closed');
        }
      });
    });

    s.once('error', () => finish('closed'));
    s.once('timeout', () => finish('closed'));

    try {
      s.connect({ port, host });
    } catch (err) {
      finish('closed');
    }
  });
}

async function checkPort(port, host, hostnameForHeader = null) {
  for (let i = 0; i < RETRIES; i++) {
    const r = await attemptConnection(port, host, CONNECT_TIMEOUT_MS, hostnameForHeader);
    if (r.status === 'open') return r;
    await new Promise(res => setTimeout(res, 150));
  }
  return { port, status: 'closed' };
}

// Wrapper so each check uses the current request's timeout
function checkPortWithTimeout(port, host, timeoutMs, hostnameForHeader = null) {
  return new Promise(async (resolve) => {
    for (let i = 0; i < RETRIES; i++) {
      const r = await attemptConnection(port, host, timeoutMs, hostnameForHeader);
      if (r.status === 'open') return resolve(r);
      await new Promise(res => setTimeout(res, 150));
    }
    resolve({ port, status: 'closed' });
  });
}

// --- Route: GET /scan?target=example.com[&ports=80,443][&timeout=1200] ---

router.get('/scan', async (req, res) => {
  const target = (req.query.target || '').trim();

  if (!target) {
    return res.status(400).json({ ok: false, error: 'target_required', details: 'target query param required' });
  }

  // Optional: custom ports & timeout (bounded)
  const customPorts = parseCustomPorts(req.query.ports);
  const ports = customPorts || DEFAULT_PORTS;

  let timeoutMs = CONNECT_TIMEOUT_MS;
  if (req.query.timeout) {
    const t = parseInt(req.query.timeout, 10);
    if (Number.isInteger(t) && t >= 200 && t <= 5000) {
      timeoutMs = t;
    }
  }

  // If user passed a literal IP, guard it first
  if (isIPv4(target) || isIPv6(target)) {
    if (isPrivateOrBlockedIP(target)) {
      return res.status(400).json({ ok: false, error: 'blocked_target', details: 'Private/loopback/link-local targets are not allowed' });
    }
  }

  // Resolve hostname → pick a public IP address (prefer IPv4)
  let address = null;
  let family = null;
  try {
    if (!isIPv4(target) && !isIPv6(target)) {
      const results = await dns.lookup(target, { all: true });
      if (!Array.isArray(results) || results.length === 0) {
        return res.status(400).json({ ok: false, error: 'invalid_host', details: 'Unable to resolve hostname' });
      }

      // Prefer public IPv4 if present, else any public address
      const publicIPv4 = results.find(r => r && r.family === 4 && !isPrivateOrBlockedIP(r.address));
      const anyPublic = results.find(r => r && !isPrivateOrBlockedIP(r.address));

      const chosen = publicIPv4 || anyPublic;
      if (!chosen) {
        return res.status(400).json({ ok: false, error: 'invalid_host', details: 'Unable to resolve to a public IP' });
      }
      address = chosen.address;
      family = chosen.family;
    } else {
      address = target;
      family = isIPv4(target) ? 4 : 6;
    }
  } catch (err) {
    return res.status(400).json({ ok: false, error: 'invalid_host', details: 'Unable to resolve hostname' });
  }

  // Final guard: block private/link-local resolved addresses
  if (isPrivateOrBlockedIP(address)) {
    return res.status(400).json({ ok: false, error: 'blocked_target', details: 'Resolved to a private/loopback/link-local IP' });
  }

  try {
    const startedAt = Date.now();

    // Run the port checks (bounded list and retries inside each check)
    // Pass 'target' (original hostname) as hostnameForHeader so HTTP/S probes can send Host/SNI
    const results = await Promise.all(
      ports.map(p => checkPortWithTimeout(p, address, timeoutMs, target))
    );

    const durationMs = Date.now() - startedAt;

    return res.json({
      ok: true,
      target,
      address,
      family,
      scanned_ports: ports.length,
      timeout_ms: timeoutMs,
      retries: RETRIES,
      duration_ms: durationMs,
      results, // [{port, status: 'open'|'closed'}]
    });
  } catch (err) {
    console.error('Network scan error:', err);
    return res.status(500).json({ ok: false, error: 'network_scan_error', details: err.message });
  }
});

module.exports = router;
