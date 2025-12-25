// routes/vuln.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

// Import OTX helper functions
const { lookupDomain, lookupIp } = require('../lib/otx');

/*
Token definitions (consistent with website.js):
  present     - header seen in response
  not_detected- header not seen in this response (informational absence)
  missing     - header expected but not returned (only counted for risk when exploitable)
  exposed     - sensitive information revealed (always increases risk)

Only `exposed` and select `missing` states should ever affect risk scoring.
*/

// Simple in-memory cache for CVE queries (avoid hitting NVD repeatedly)
const cveCache = new Map(); // key -> { ts, data }
const CVE_CACHE_TTL = 1000 * 60 * 5; // 5 minutes

const BASE = process.env.BASE_URL || `http://localhost:${process.env.PORT || 8080}`;

function now() { return Date.now(); }
function setCache(k, v) { cveCache.set(k, { ts: now(), data: v }); }
function getCache(k) {
  const e = cveCache.get(k);
  if (!e) return null;
  if (now() - e.ts > CVE_CACHE_TTL) { cveCache.delete(k); return null; }
  return e.data;
}

function severityWeight(s) {
  if (!s) return 0;
  if (s === 'Critical') return 4;
  if (s === 'High') return 3;
  if (s === 'Medium') return 2;
  if (s === 'Low') return 1;
  return 0;
}

// Heuristic to produce a human-friendly software label for a CVE based on keywords
function deriveSoftwareLabel(cveItem, detected) {
  try {
    const summary = (cveItem.summary || '').toLowerCase();
    // Known mappings
    if (summary.includes('log4j') || summary.includes('log4j2') || summary.includes('log4j-core')) return 'Apache Log4j (Java library)';
    if (summary.includes('commons-configuration')) return 'Apache Commons Configuration (Java library)';
    if (summary.includes('roxy-wi') || summary.includes('roxywi')) return 'Roxy-WI (admin panel)';
    if (summary.includes('tomcat')) return 'Apache Tomcat (Java servlet container)';
    if (summary.includes('struts')) return 'Apache Struts (Java framework)';
    if (summary.includes('httpd') || summary.includes('apache http server') || summary.includes('apache httpd')) return 'Apache HTTP Server';
    // Fallback: if detected name available, use it with inferred marker
    if (detected && detected.name) return `${String(detected.name).replace(/[-_]/g,' ')}${detected.version ? ` ${detected.version}` : ''} (inferred)`;
    return 'Inferred software (family)';
  } catch (e) { return 'Inferred software (family)'; }
}

// Ports that should be flagged as concerning if open
const DANGEROUS_OPEN_PORTS = {
  22: { name: 'SSH', severity: 'High' },
  21: { name: 'FTP', severity: 'High' },
  25: { name: 'SMTP', severity: 'High' },
  3306: { name: 'MySQL', severity: 'High' },
  5432: { name: 'PostgreSQL', severity: 'High' },
  6379: { name: 'Redis', severity: 'High' }
};

// heuristic map port -> implied service importance (for documentation only)
const PORT_SERVICE_SEVERITY = {
  22: 'Medium',   // SSH
  21: 'Low',
  23: 'Low',
  25: 'High',     // SMTP open can be abused
  53: 'Low',
  80: 'Medium',
  443: 'Medium',
  3306: 'High',   // MySQL
  5432: 'High',   // Postgres
  6379: 'High',   // Redis
  8080: 'Medium',
};

// call internal endpoints with reasonable timeouts
async function callWebsite(url) {
  try {
    // Timeout must be longer than website.js's internal timeout (30s GET + buffer)
    const resp = await axios.post(`${BASE}/api/website/scan`, { url }, { timeout: 40000 });
    // Check if the response itself indicates an error (e.g., unreachable host)
    if (resp.data && resp.data.ok === false) {
      return { ok: false, error: resp.data.error, data: resp.data };
    }
    return { ok: true, data: resp.data };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
}

async function callNetwork(host) {
  try {
    const resp = await axios.get(`${BASE}/api/network/scan`, { params: { target: host }, timeout: 15000 });
    return { ok: true, data: resp.data };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
}

async function callCve(query, opts = {}) {
  if (!query) return { ok: false, error: 'empty_query' };

  const cacheKey = `${query}|v=${opts.version || 'none'}`;
  const cached = getCache(cacheKey);
  if (cached) {
    console.log('[CVE] Cache hit for', cacheKey);
    return { ok: true, data: cached };
  }

  try {
    const url = `${BASE}/api/cve/search`;
    console.log('[CVE] Calling CVE endpoint with version:', opts.version);
    // No timeout here - let cve.js handle it with its 8-second limit
    const resp = await axios.get(url, { params: { q: query, limit: opts.limit || 5, version: opts.version || '' } });
    setCache(cacheKey, resp.data);
    return { ok: true, data: resp.data };
  } catch (err) {
    console.log('[CVE] CVE call failed:', err.message);
    return { ok: false, error: String(err.message || err) };
  }
}

// /api/vuln/lite
// body: { url: "https://example.com", software: "apache 2.4.49" } (software optional)
router.post('/lite', async (req, res) => {
  const { url, software } = req.body || {};
  if (!url && !software) return res.status(400).json({ ok: false, error: 'provide url or software' });

  const host = url ? url.replace(/^https?:\/\//i, '').split(/[\/:]/)[0] : null;
  const results = { ok: true, url: url || null, host: host || null, site: null, network: null, cves: null, findings: [], errors: [] };

  // run website scan & network scan in parallel
  const tasks = [];
  if (url) tasks.push(callWebsite(url));
  else tasks.push(Promise.resolve({ ok: false, error: 'no_url' }));

  if (host) tasks.push(callNetwork(host));
  else tasks.push(Promise.resolve({ ok: false, error: 'no_host' }));

  const [siteRes, netRes] = await Promise.all(tasks);

  // If website scan returned unreachable error, pass it through
  if (!siteRes.ok && siteRes.data && siteRes.data.error === 'UNREACHABLE_HOST') {
    return res.status(200).json({
      ok: false,
      error: 'UNREACHABLE_HOST',
      message: siteRes.data.message,
      context: siteRes.data.context
    });
  }

  if (!siteRes.ok) results.errors.push({ which: 'website', error: siteRes.error });
    else {
      // Capture scan_status from website response
      if (siteRes.data.scan_status) {
        results.scan_status = siteRes.data.scan_status;
        results.scan_limit_reason = siteRes.data.scan_limit_reason;
      }
      
      // Convert new comprehensive format to legacy format for compatibility
      const siteData = siteRes.data;
      results.site = {
        quick: {
          status_code: siteData.scan_info?.status_code,
          final_url: siteData.scan_info?.final_url
        },
        ssl: siteData.ssl,
        reputation: siteData.reputation,
        headers: {
          server: siteData.headers?.server?.value || null,
          https: siteData.https_status?.secure || false,
          hsts: siteData.headers?.hsts?.status === 'present',
          csp: siteData.headers?.csp?.status === 'present',
          x_frame_options: siteData.headers?.x_frame_options?.status === 'present',
          x_content_type_options: siteData.headers?.x_content_type_options?.status === 'present',
          referrer_policy: siteData.headers?.referrer_policy?.status === 'present',
          cors: siteData.headers?.cors?.value || null
        },
        // Include full header classification for detailed findings
        headers_classified: siteData.headers,
        risk_assessment: siteData.risk_assessment,
        // Include raw headers for software detection
        raw_headers: siteData.raw_headers || {}
      };
      results.tls = siteData.tls || null;
    }

  if (!netRes.ok) results.errors.push({ which: 'network', error: netRes.error });
  else results.network = netRes.data;

  // determine best CVE query and parse software/version
  // preferred order: explicit `software` param -> server header -> host
  
  // Map server names to their CVE database equivalents
  function mapToCVESearchName(serverName) {
    const name = serverName.toLowerCase();
    const mapping = {
      'apache-coyote': 'apache tomcat',
      'coyote': 'apache tomcat',
      'tomcat': 'apache tomcat',
      'apache': 'apache http server',
      'httpd': 'apache http server',
      'nginx': 'nginx',
      'iis': 'microsoft iis',
      'microsoft-iis': 'microsoft iis',
      'php': 'php',
      'wordpress': 'wordpress',
      'joomla': 'joomla',
      'drupal': 'drupal',
      'mysql': 'mysql',
      'postgresql': 'postgresql',
      'redis': 'redis',
      'mongodb': 'mongodb',
      'nodejs': 'node.js',
      'node': 'node.js',
      'express': 'express',
      'django': 'django',
      'rails': 'ruby on rails',
      'spring': 'spring framework',
      'struts': 'apache struts'
    };
    
    // Direct mapping
    if (mapping[name]) return mapping[name];
    
    // Partial matches for common variations
    if (name.includes('tomcat')) return 'apache tomcat';
    if (name.includes('apache')) return 'apache http server';
    if (name.includes('iis')) return 'microsoft iis';
    if (name.includes('nginx')) return 'nginx';
    if (name.includes('php')) return 'php';
    if (name.includes('wordpress')) return 'wordpress';
    if (name.includes('mysql')) return 'mysql';
    if (name.includes('node')) return 'node.js';
    
    // Return original if no mapping found
    return name;
  }
  
  function parseSoftwareString(str) {
    if (!str) return { name: null, version: null };
    const s = String(str).trim();
    // common formats: "nginx/1.18.0", "Apache/2.4.49 (Unix)", "Apache 2.4.49", "wordpress"
    const slashMatch = s.match(/^([A-Za-z0-9\-_.]+)\/(\S+)/);
    if (slashMatch) return { name: slashMatch[1].toLowerCase(), version: slashMatch[2] };
    const spaceMatch = s.match(/^([A-Za-z0-9\-_.]+)\s+([0-9]+[\.0-9a-zA-Z_-]*)/);
    if (spaceMatch) return { name: spaceMatch[1].toLowerCase(), version: spaceMatch[2] };
    // fallback: take first token as name
    const first = s.split(/[\s\/;()]+/)[0];
    return { name: first.toLowerCase(), version: null };
  }

  let detected = { name: null, version: null };
  if (software) detected = parseSoftwareString(software);
  
  if ((!detected.name || detected.name === 'server') && results.site && results.site.raw_headers && results.site.raw_headers.server) {
    const srv = results.site.raw_headers.server;
    detected = parseSoftwareString(srv || '');
  }
  if ((!detected.name || detected.name === 'server') && host) {
    const firstLabel = host.split('.')[0].toLowerCase();
    if (firstLabel && firstLabel !== 'www') {
      detected.name = firstLabel;
    } else {
      detected.name = null;
    }
  }

  const MANAGED_INFRASTRUCTURE = ['gws','cloudflare','akamai','amazon','microsoft-iis','esf'];

  // CVE DECISION GATE: Only run CVE if version is detected
  if (!detected.name) {
    console.log('[CVE] No software detected; skipping CVE lookup');
    results.cves = {
      status: 'skipped',
      software: detected.name,
      reason: 'Software not detected'
    };
  } else if (MANAGED_INFRASTRUCTURE.some(i => detected.name.includes(i))) {
    console.log('[CVE] Detected managed infra; skipping CVE for', detected.name);
    results.cves = {
      status: 'skipped',
      software: detected.name,
      reason: 'Managed infrastructure detected'
    };
  } else if (!detected.version) {
    // VERSION NOT DETECTED: Skip CVE in default scan, let frontend offer intel option
    console.log('[CVE] Version not detected; skipping default CVE for', detected.name);
    results.cves = {
      status: 'skipped',
      software: detected.name,
      reason: 'Software version not exposed'
    };
  } else {
    // VERSION DETECTED: Run confirmed CVE search only
    console.log('[CVE] Version detected:', detected.name, detected.version, '— running CVE search');
    const q = mapToCVESearchName(detected.name);
    console.log('[CVE] Mapped search query:', q, '(original:', detected.name, ')');
    try {
      const cveRes = await callCve(q, { limit: 8, version: detected.version });
      if (cveRes.ok) {
        results.cves = Object.assign({}, cveRes.data, { 
          status: 'confirmed', 
          software: detected.name,
          version: detected.version
        });
        console.log(`[CVE] Found ${cveRes.data.count || 0} confirmed CVEs for ${detected.name} ${detected.version}`);
      } else {
        results.cves = {
          status: 'error',
          software: detected.name,
          version: detected.version,
          reason: cveRes.error || 'CVE lookup failed'
        };
        console.log('[CVE] CVE lookup failed:', cveRes.error);
      }
    } catch (cveErr) {
      console.error('[CVE] Exception during CVE lookup:', cveErr.message);
      results.cves = {
        status: 'error',
        software: detected.name,
        version: detected.version,
        reason: 'CVE lookup exception'
      };
    }
  }

  // --- OTX Integration ---
  try {
    if (host) {
      const otxDom = await lookupDomain(host);
      if (otxDom.ok && otxDom.count > 0) {
        results.findings.push({
          category: "threat-intel",
          title: `Domain associated with ${otxDom.count} threat reports (OTX)`,
          severity: otxDom.count >= 5 ? "High" : (otxDom.count >= 2 ? "Medium" : "Low"),
          detail: `AlienVault OTX shows ${otxDom.count} pulses referencing this domain.`,
          evidence: { pulses: otxDom.pulses.slice(0,5) }
        });
      }
    }
  } catch (e) {
    console.error('OTX integration error', e);
    results.errors.push({ which: 'otx', error: String(e.message || e) });
  }

  // Build website findings from classified headers
  try {
    if (results.site && results.site.headers_classified) {
      const classified = results.site.headers_classified;
      
      // Skip header findings if scan was limited (active protection detected)
      if (results.scan_status !== 'limited') {
        // Only add findings for CRITICAL and MEDIUM severity headers
        // Skip Informational headers (they don't indicate vulnerability)
        for (const [headerName, header] of Object.entries(classified)) {
          // Skip informational and contextual headers
          if (header.severity === 'Informational' || header.severity === 'Not Applicable') {
            continue;
          }

          // Only flag if header is not present and severity is Medium or High
          if (header.status !== 'present' && (header.severity === 'Medium' || header.severity === 'High')) {
            results.findings.push({
              category: 'website',
              title: `${headerName.replace(/_/g, '-').toUpperCase()}: ${header.status}`,
              severity: header.severity,
            detail: header.note,
            evidence: { header: headerName }
          });
          }
        }
      }

      // Optionally log if server header is exposed (informational)
      if (classified.server && classified.server.status === 'exposed') {
        console.log(`[Scan] Server header exposed: ${classified.server.value}`);
      }
    }
  } catch (e) {
    console.error('Header findings error:', e);
  }

  // Helper: classify service type by port
  function getServiceType(port) {
    if ([21, 22].includes(port)) return 'admin';
    if ([110, 143, 465, 587].includes(port)) return 'mail';
    if ([80, 443].includes(port)) return 'web';
    return 'other';
  }

  // Network findings and exposure summary
  const exposedServices = { admin: [], mail: [], web: [], other: [] };
  const closedPorts = [];
  let totalScanned = 0;
  
  if (results.network && Array.isArray(results.network.results)) {
    totalScanned = results.network.results.length;
    
    for (const p of results.network.results) {
      const serviceType = getServiceType(p.port);
      
      if (p.status === 'open') {
        // Track ALL open ports in exposure summary
        exposedServices[serviceType].push(p.port);
        
        // Only flag dangerous ports in findings for detailed listing
        if (DANGEROUS_OPEN_PORTS[p.port]) {
          const portInfo = DANGEROUS_OPEN_PORTS[p.port];
          const evidence = { port: p.port, service: portInfo.name };
          if (p.banner) evidence.banner = p.banner;
          results.findings.push({
            category: 'network',
            port: p.port,
            service: portInfo.name,
            service_type: serviceType,
            title: `${portInfo.name} (Port ${p.port}) is exposed`,
            severity: portInfo.severity,
            detail: `Port ${p.port} (${portInfo.name}) is reachable and open on host ${results.network.host || results.network.address || results.network.target || ''}.`,
            evidence
          });
        }
      } else if (p.status === 'closed' || p.status === 'filtered') {
        closedPorts.push(p.port);
      }
    }
  }

  // Build network exposure summary
  results.network_exposure = {
    admin_services: exposedServices.admin,
    mail_services: exposedServices.mail,
    web_services: exposedServices.web,
    other_services: exposedServices.other,
    total_exposed: exposedServices.admin.length + exposedServices.mail.length + exposedServices.web.length + exposedServices.other.length,
    total_closed_filtered: closedPorts.length,
    total_scanned: totalScanned
  };

  // CVE findings - only add if status is 'confirmed' (version was detected)
  if (results.cves && results.cves.status === 'confirmed' && Array.isArray(results.cves.items)) {
    console.log(`[CVE Processing] Processing ${results.cves.items.length} confirmed CVEs for ${results.cves.software} ${results.cves.version}`);
    for (const c of results.cves.items) {
      try {
        const softwareLabel = deriveSoftwareLabel(c, detected);
        const detectionBasis = `Detected: ${results.cves.software} version ${results.cves.version}. This CVE affects that version.`;
        
        results.findings.push({
          category: 'cve',
          id: c.id,
          title: c.id + ' — ' + (c.summary ? (c.summary.length > 120 ? c.summary.slice(0, 117) + '...' : c.summary) : ''),
          severity: c.severity || 'Unknown',
          detail: c.summary || '',
          confidence: 'Confirmed',
          detection_basis: detectionBasis,
          software: softwareLabel,
          evidence: { nvd: c.nvd_url || null, references: c.references || [], affected_versions: c.affected_versions || null },
          likely_applicable: true
        });
      } catch (cveErr) {
        console.error('[CVE Processing Error]', cveErr.message, 'CVE:', c.id);
      }
    }
    console.log(`[CVE Processing] Added ${results.cves.items.length} CVEs to findings`);
  } else if (results.cves && results.cves.status === 'skipped') {
    console.log(`[CVE Processing] CVE skipped: ${results.cves.reason}`);
  }

  // sort findings
  results.findings.sort((a,b) => {
    const w = severityWeight(a.severity) - severityWeight(b.severity);
    if (w !== 0) return -w;
    if (a.category === 'cve' && b.category !== 'cve') return -1;
    if (b.category === 'cve' && a.category !== 'cve') return 1;
    return 0;
  });

  res.json(results);
});

module.exports = router;
