// routes/cve.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

function getSeverity(cvss) {
  if (cvss >= 9) return 'Critical';
  if (cvss >= 7) return 'High';
  if (cvss >= 4) return 'Medium';
  if (cvss > 0) return 'Low';
  return 'Unknown';
}

function formatDateIsoToYMD(iso) {
  try {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  } catch {
    return '';
  }
}

function extractCvss(cve) {
  // Support v3.1, v3.0, v2.0 metrics if present
  try {
    const m = cve.metrics || {};
    const v31 = m.cvssMetricV31 || [];
    const v30 = m.cvssMetricV30 || [];
    const v2 = m.cvssMetricV2 || [];
    if (v31.length > 0 && v31[0].cvssData) return v31[0].cvssData.baseScore;
    if (v30.length > 0 && v30[0].cvssData) return v30[0].cvssData.baseScore;
    if (v2.length > 0 && v2[0].cvssData) return v2[0].cvssData.baseScore;
  } catch (e) {}
  return null;
}

// GET /api/cve/search?q=apache&limit=10&min_cvss=7&since_year=2020&version=2.4.49
router.get('/search', async (req, res) => {
  const q = (req.query.q || req.query.query || '').trim();
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '10', 10))); // 1..100
  const minCvss = req.query.min_cvss ? parseFloat(req.query.min_cvss) : null;
  const sinceYear = req.query.since_year ? parseInt(req.query.since_year, 10) : null;
  const version = req.query.version ? String(req.query.version).trim() : null;

  if (!q) return res.status(400).json({ ok: false, error: 'missing_query' });

  try {
    // NVD keyword search (flexible)
    const nvdUrl = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(q)}`;
    const { data } = await axios.get(nvdUrl, { timeout: 20000 });

    let items = (data.vulnerabilities || []).map(entry => {
      const cve = entry.cve || {};
      const cvss = extractCvss(cve);
      const publishedRaw = cve.published || cve.publishedDate || '';
      return {
        id: cve.id || '',
        summary: cve.descriptions?.[0]?.value || '',
        cvss: cvss !== undefined ? cvss : null,
        severity: getSeverity(cvss || 0),
        published: formatDateIsoToYMD(publishedRaw),
        nvd_url: cve.id ? `https://nvd.nist.gov/vuln/detail/${cve.id}` : null,
        references: Array.from(new Set((cve.references || []).map(r => r.url).filter(Boolean)))
      };
    });

    // Filter by minCvss or sinceYear if provided
    if (minCvss !== null && !isNaN(minCvss)) {
      items = items.filter(i => (i.cvss !== null && i.cvss >= minCvss));
    }
    if (sinceYear && !isNaN(sinceYear)) {
      items = items.filter(i => {
        if (!i.published) return false;
        const y = new Date(i.published).getFullYear();
        return y >= sinceYear;
      });
    } else {
      // default: keep last 3 years or cvss>=7 (if no sinceYear param)
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 3);
      items = items.filter(i => (i.cvss !== null && i.cvss >= 7) || (i.published && new Date(i.published) >= cutoff));
    }

    // If version provided, boost items that mention the version in summary
    if (version) {
      const vLower = version.toLowerCase();
      items.sort((a, b) => {
        const aMatch = (a.summary || '').toLowerCase().includes(vLower) ? 1 : 0;
        const bMatch = (b.summary || '').toLowerCase().includes(vLower) ? 1 : 0;
        if (aMatch !== bMatch) return bMatch - aMatch;
        // otherwise by cvss desc then date
        const cvssDiff = (b.cvss || 0) - (a.cvss || 0);
        if (cvssDiff !== 0) return cvssDiff;
        return new Date(b.published || 0) - new Date(a.published || 0);
      });
    } else {
      // Sort by cvss desc then published desc
      items.sort((a, b) => {
        const cvssDiff = (b.cvss || 0) - (a.cvss || 0);
        if (cvssDiff !== 0) return cvssDiff;
        return new Date(b.published || 0) - new Date(a.published || 0);
      });
    }

    // Limit results to 'limit'
    const limited = items.slice(0, limit);

    res.json({
      ok: true,
      query: q,
      count: limited.length,
      items: limited
    });
  } catch (err) {
    console.error('CVE search error', err?.message || err);
    res.status(500).json({ ok: false, error: 'cve_api_error', details: err?.message || String(err) });
  }
});

module.exports = router;
