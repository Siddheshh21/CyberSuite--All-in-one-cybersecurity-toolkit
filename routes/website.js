// routes/website.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const sslChecker = require('ssl-checker'); // ssl-checker expects a hostname
// Google Safe Browsing API key from environment variables
const googleSafeBrowsingApiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY || null;

// Helper: normalize header names to lowercase keys (use response.headers as source of truth)
function normalizeHeaders(rawHeaders = {}) {
  const out = {};
  for (const [k, v] of Object.entries(rawHeaders)) {
    out[k.toLowerCase()] = v;
  }
  return out;
}

// Analyze headers and produce friendly advice
function analyzeHeaders(headersMap, isHttps) {
  const results = {};
  results.https = !!isHttps;
  results.server = headersMap['server'] || null;

  // prefer CSP and report-only form
  results.content_security_policy = headersMap['content-security-policy'] || headersMap['content-security-policy-report-only'] || null;
  results.hsts = headersMap['strict-transport-security'] || null;
  results.x_frame_options = headersMap['x-frame-options'] || null;
  results.x_content_type_options = headersMap['x-content-type-options'] || null;
  results.referrer_policy = headersMap['referrer-policy'] || null;
  results.cors = headersMap['access-control-allow-origin'] || null;

  // Advice  
  const advice = [];
  if (!results.https) {
    advice.push('Site is not using HTTPS — use TLS (HTTPS) to secure data in transit.');
  } else {
    if (!results.hsts) advice.push('HSTS header missing — consider enabling Strict-Transport-Security.');
  }
  if (!results.content_security_policy) advice.push('CSP missing — add Content-Security-Policy to reduce XSS risk.');
  if (!results.x_frame_options) advice.push('X-Frame-Options missing — consider adding to prevent clickjacking.');
  if (!results.x_content_type_options) advice.push('X-Content-Type-Options missing — add to prevent MIME sniffing.');
  if (results.server) {
    advice.push(`Server header present (${results.server}) — exposing server software may aid attackers; hide if possible.`);
  }

  return { results, advice };
}

// Ensure a string looks like a URL or throw
function ensureFullUrl(input) {
  // If input already has protocol, return as-is; otherwise try https then http
  try {
    // If parse succeeds, return normalized URL
    const u = new URL(input);
    return u.toString();
  } catch {
    // no protocol provided, try https
    try {
      const u = new URL('https://' + input);
      return u.toString();
    } catch {
      // fall back to http
      const u = new URL('http://' + input);
      return u.toString();
    }
  }
}

router.post('/scan', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      console.error('Invalid URL received:', url);
      return res.status(400).json({ error: 'URL required (e.g. https://example.com)' });
    }

    // Normalize & construct a full URL (always try HTTPS first)
    let requestedFullUrl;
    try {
      requestedFullUrl = ensureFullUrl(url.trim());
    } catch (e) {
      console.error('Invalid URL after normalization:', url, e.message);
      return res.status(400).json({ error: 'Invalid URL' });
    }

    console.log('Scanning URL (requested):', requestedFullUrl);

    // Perform the GET to fetch headers (follow redirects)
    let response;
    try {
      response = await axios.get(requestedFullUrl, {
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: () => true,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CybersuiteBot/1.0)' }
      });
      console.log('Fetch complete for', requestedFullUrl, 'status', response.status);
    } catch (err) {
      console.error('Error during fetch:', err && err.message ? err.message : err);
      return res.status(502).json({ ok: false, error: 'fetch_failed', message: String(err && err.message ? err.message : err) });
    }

    // Determine final URL (after redirects). Prefer axios final URL if available
    const finalUrlRaw = (response.request && response.request.res && response.request.res.responseUrl)
      || (response.config && response.config.url)
      || requestedFullUrl;

    let finalUrl;
    try {
      finalUrl = new URL(finalUrlRaw).toString();
    } catch {
      // fallback to requestedFullUrl if parsing finalUrlRaw fails
      finalUrl = requestedFullUrl;
    }

    // isHttps: rely on finalUrl's protocol (most robust)
    let isHttps = false;
    try {
      isHttps = new URL(finalUrl).protocol === 'https:';
    } catch {
      isHttps = finalUrl.toLowerCase().startsWith('https://');
    }

    // Normalize headers from axios response.headers (source of truth); keys lowercased
    const headers = normalizeHeaders(response.headers || {});

    // Analyze headers
    const analyzed = analyzeHeaders(headers, isHttps);

    // SSL/TLS info: use hostname from final URL for ssl-checker (not full URL)
    const hostnameForSsl = (() => {
      try {
        return new URL(finalUrl).hostname;
      } catch {
        // try from requestedFullUrl
        return new URL(requestedFullUrl).hostname;
      }
    })();

    let sslInfo = null;
    try {
      // ssl-checker accepts a hostname like 'example.com'
      // If ssl-checker throws, we continue but mark ssl as null
      sslInfo = await sslChecker(hostnameForSsl);
      console.log('SSL Info for', hostnameForSsl, sslInfo && sslInfo.valid ? 'valid' : 'invalid/unknown');
    } catch (err) {
      console.error('sslChecker error for', hostnameForSsl, err && err.message ? err.message : err);
      sslInfo = null; // continue - don't abort the whole scan
    }

    // Google Safe Browsing: only if API key available; use finalUrl (full) for threat entry
    let reputation = 'unknown';
    if (googleSafeBrowsingApiKey) {
      try {
        const safeBrowsingPayload = {
          client: { clientId: 'cybersuite', clientVersion: '1.0' },
          threatInfo: {
            threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{ url: finalUrl }]
          }
        };

        const safeRes = await axios.post(
          `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${googleSafeBrowsingApiKey}`,
          safeBrowsingPayload,
          { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
        );

        if (safeRes.data && safeRes.data.matches) {
          reputation = 'malicious';
        } else {
          reputation = 'safe';
        }
      } catch (err) {
        console.error('Safe Browsing check failed, continuing scan:', err && err.message ? err.message : err);
        reputation = 'unknown';
      }
    } else {
      reputation = 'unknown';
    }

    // Quick info
    const quick = {
      status_code: response.status,
      final_url: finalUrl
    };

    // Prepare final headers summary booleans and values you previously used
    res.json({
      ok: true,
      quick,
      ssl: sslInfo,
      reputation,
      headers: {
        server: analyzed.results.server,
        https: analyzed.results.https,
        hsts: !!analyzed.results.hsts,
        csp: !!analyzed.results.content_security_policy,
        x_frame_options: !!analyzed.results.x_frame_options,
        x_content_type_options: !!analyzed.results.x_content_type_options,
        referrer_policy: !!analyzed.results.referrer_policy,
        cors: analyzed.results.cors || null
      },
      advice: analyzed.advice
    });

  } catch (err) {
    console.error('Website scan error', err && err.message ? err.message : err);
    res.status(500).json({ ok: false, error: 'internal_error', message: String(err && err.message ? err.message : err) });
  }
});

module.exports = router;
