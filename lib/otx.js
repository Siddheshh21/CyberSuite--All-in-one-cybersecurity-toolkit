// lib/otx.js
const axios = require('axios');

// tiny in-memory cache to avoid repeated OTX queries
const cache = new Map();
const TTL = 1000 * 60 * 5; // 5 minutes

function cacheGet(key) {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > TTL) { cache.delete(key); return null; }
  return e.val;
}
function cacheSet(key, val) {
  cache.set(key, { ts: Date.now(), val });
}

/**
 * Lookup domain in OTX. Returns normalized object:
 * { ok: true, count: Number, pulses: [ { id, name, author, modified, tags } ] }
 */
async function lookupDomain(domain) {
  if (!domain) return { ok: false, error: 'no_domain' };

  const key = `otx:domain:${domain}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  try {
    const url = `https://otx.alienvault.com/api/v1/indicators/domain/${encodeURIComponent(domain)}/general`;
    const resp = await axios.get(url, {
      headers: { 'X-OTX-API-KEY': process.env.OTX_API_KEY || '' },
      timeout: 12_000
    });

    const data = resp.data || {};
    // pulse_info has count and pulses info
    const count = data.pulse_info?.count || 0;
    const pulses = (data.pulse_info?.pulses || []).map(p => ({
      id: p.id,
      name: p.name,
      author: p.author?.username || p.author,
      modified: p.modified,
      tags: p.tags || []
    }));

    const out = { ok: true, count, pulses, raw: data };
    cacheSet(key, out);
    return out;
  } catch (err) {
    // normalize error
    const e = { ok: false, error: String(err.message || err) };
    return e;
  }
}

/**
 * Lookup IPv4 address in OTX.
 * Returns similar shape: { ok, count, pulses, raw }
 */
async function lookupIp(ip) {
  if (!ip) return { ok: false, error: 'no_ip' };

  const key = `otx:ip:${ip}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  try {
    const url = `https://otx.alienvault.com/api/v1/indicators/IPv4/${encodeURIComponent(ip)}/general`;
    const resp = await axios.get(url, {
      headers: { 'X-OTX-API-KEY': process.env.OTX_API_KEY || '' },
      timeout: 12_000
    });
    const data = resp.data || {};
    const count = data.pulse_info?.count || 0;
    const pulses = (data.pulse_info?.pulses || []).map(p => ({
      id: p.id,
      name: p.name,
      author: p.author?.username || p.author,
      modified: p.modified,
      tags: p.tags || []
    }));
    const out = { ok: true, count, pulses, raw: data };
    cacheSet(key, out);
    return out;
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
}

module.exports = { lookupDomain, lookupIp };
