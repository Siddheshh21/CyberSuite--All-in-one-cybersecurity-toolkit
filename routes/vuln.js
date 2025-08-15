// routes/vuln.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

// Import OTX helper functions
const { lookupDomain, lookupIp } = require('../lib/otx');

// Simple in-memory cache for CVE queries (avoid hitting NVD repeatedly)
const cveCache = new Map(); // key -> { ts, data }
const CVE_CACHE_TTL = 1000 * 60 * 5; // 5 minutes

const BASE = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

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

// heuristic map port -> implied service importance
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
    const resp = await axios.post(`${BASE}/api/website/scan`, { url }, { timeout: 12000 });
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

  const cacheKey = `${query}|limit=${opts.limit||5}`;
  const cached = getCache(cacheKey);
  if (cached) return { ok: true, data: cached };

  try {
    const url = `${BASE}/api/cve/search`;
    const resp = await axios.get(url, { params: { q: query, limit: opts.limit || 5, version: opts.version || '' }, timeout: 20000 });
    setCache(cacheKey, resp.data);
    return { ok: true, data: resp.data };
  } catch (err) {
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

  if (!siteRes.ok) results.errors.push({ which: 'website', error: siteRes.error });
  else results.site = siteRes.data;

  if (!netRes.ok) results.errors.push({ which: 'network', error: netRes.error });
  else results.network = netRes.data;

  // determine best CVE query
  let cveQuery = software && String(software).trim();
  if (!cveQuery && results.site && results.site.headers && results.site.headers.server) {
    const s = results.site.headers.server;
    cveQuery = s.split(' ')[0];
  }
  if (!cveQuery && host) cveQuery = host.split('.')[0];

  // call CVE search
  let cveRes = { ok: false };
  if (cveQuery) {
    cveRes = await callCve(cveQuery, { limit: 8, version: software || '' });
    if (!cveRes.ok) results.errors.push({ which: 'cve', error: cveRes.error });
    else results.cves = cveRes.data;
  } else {
    results.errors.push({ which: 'cve', error: 'no_query_available' });
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

  // Build website findings
  try {
    if (results.site && results.site.quick) {
      const h = results.site.headers || {};
      if (false) {
        // No HTTPS finding removed as per user request
      } else {
        if (!results.site.headers.hsts) {
          results.findings.push({
            category: 'website',
            title: 'HSTS missing',
            severity: 'Medium',
            detail: 'Strict-Transport-Security header missing — consider enabling HSTS.',
            evidence: {}
          });
        }
        if (!results.site.headers.csp) {
          results.findings.push({
            category: 'website',
            title: 'CSP missing',
            severity: 'Medium',
            detail: 'Content-Security-Policy header missing — reduces XSS protection.',
            evidence: {}
          });
        }
        if (!results.site.headers.x_frame_options) {
          results.findings.push({
            category: 'website',
            title: 'X-Frame-Options missing',
            severity: 'Low',
            detail: 'X-Frame-Options header is missing — site may be vulnerable to clickjacking.',
            evidence: {}
          });
        }
      }
      if (results.site.headers.server) {
        results.findings.push({
          category: 'website',
          title: `Server header exposes software (${results.site.headers.server})`,
          severity: 'Low',
          detail: 'Server header reveals server software — consider hiding or reducing detail.',
          evidence: { server: results.site.headers.server }
        });
      }
    }
  } catch (e) {}

  // Network findings
  if (results.network && Array.isArray(results.network.results)) {
    for (const p of results.network.results) {
      if (p.open) {
        const suggestedSeverity = PORT_SERVICE_SEVERITY[p.port] || 'Low';
        results.findings.push({
          category: 'network',
          title: `Port ${p.port} open`,
          severity: suggestedSeverity,
          detail: `Port ${p.port} is reachable on host ${results.network.host}.`,
          evidence: { port: p.port }
        });
      }
    }
  }

  // CVE findings
  if (results.cves && Array.isArray(results.cves.items)) {
    for (const c of results.cves.items) {
      const applicable = (software && c.summary && software.toLowerCase() && c.summary.toLowerCase().includes(software.toLowerCase())) ||
                         (results.site && results.site.headers && results.site.headers.server && c.summary && c.summary.toLowerCase().includes(results.site.headers.server.toLowerCase()));
      results.findings.push({
        category: 'cve',
        id: c.id,
        title: c.id + ' — ' + (c.summary ? (c.summary.length>120? c.summary.slice(0,117)+'...': c.summary) : ''),
        severity: c.severity || 'Unknown',
        detail: c.summary || '',
        evidence: { nvd: c.nvd_url || null, references: c.references || [] },
        likely_applicable: !!applicable
      });
    }
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
