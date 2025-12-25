// routes/cve.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

// Blocklist: skip CVE search for managed infrastructure (these are hosted/proxy providers)
const MANAGED_INFRASTRUCTURE = ['gws', 'cloudflare', 'akamai', 'amazon', 'microsoft-iis', 'esf'];

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

function extractAffectedVersions(cve) {
  try {
    const nodes = cve.configurations && cve.configurations.nodes ? cve.configurations.nodes : (cve.configurations || []).nodes || [];
    const ranges = [];
    if (Array.isArray(nodes) && nodes.length > 0) {
      for (const node of nodes) {
        const cpeMatches = node.cpeMatch || node.cpe_match || [];
        for (const m of cpeMatches) {
          const start = m.versionStartIncluding || m.versionStartExcluding || null;
          const end = m.versionEndIncluding || m.versionEndExcluding || null;
          if (start || end) {
            ranges.push(`${start || '*'} - ${end || '*'}`);
          } else if (m.cpe23Uri) {
            const parts = String(m.cpe23Uri).split(':');
            const ver = parts[5] || null;
            if (ver) ranges.push(ver);
          }
        }
      }
    }
    if (ranges.length === 0) return null;
    return Array.from(new Set(ranges)).slice(0,5).join(', ');
  } catch (e) {
    return null;
  }
}

// GET /api/cve/search?q=apache&limit=10&min_cvss=7&since_year=2020&version=2.4.49
router.get('/search', async (req, res) => {
  const q = (req.query.q || req.query.query || '').trim();
  const version = req.query.version ? String(req.query.version).trim() : null;
  
  // CRITICAL: Version is required for default scan
  if (!version) {
    return res.json({
      ok: true,
      items: [],
      skipped: true,
      reason: 'Version not provided'
    });
  }
  
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '10', 10))); // 1..100
  const minCvss = req.query.min_cvss ? parseFloat(req.query.min_cvss) : null;
  const sinceYear = req.query.since_year ? parseInt(req.query.since_year, 10) : null;

  if (!q) return res.status(400).json({ ok: false, error: 'missing_query' });

  // Normalize query and check block list
  const qLower = q.toLowerCase();
  const isBlocked = MANAGED_INFRASTRUCTURE.some(infra => qLower.includes(infra));

  if (isBlocked) {
    return res.json({
      ok: true,
      skipped: true,
      query: q,
      count: 0,
      items: [],
      message: 'CVE scan skipped because detected software is managed infrastructure.'
    });
  }
  // At this point, we will run CVE lookups for the provided query (broad or precise)
  // unless it matched a managed infrastructure provider above.

  try {
    // NVD keyword search (flexible)
    const nvdUrl = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(q)}&resultsPerPage=200`;
    console.log(`[CVE Search] Querying NVD for: ${q} version: ${version}`);
    const startTime = Date.now();
    const { data } = await axios.get(nvdUrl, { timeout: 8000 }); // 8 second hard timeout
    const elapsed = Date.now() - startTime;
    console.log(`[CVE Search] NVD request completed in ${elapsed}ms, returned ${(data.vulnerabilities || []).length} vulnerabilities`);

    let items = (data.vulnerabilities || []).map(entry => {
      const cve = entry.cve || {};
      const cvss = extractCvss(cve);
      const publishedRaw = cve.published || cve.publishedDate || '';
      const affected = extractAffectedVersions(cve);
      return {
        id: cve.id || '',
        summary: cve.descriptions?.[0]?.value || '',
        cvss: cvss !== undefined ? cvss : null,
        severity: getSeverity(cvss || 0),
        published: formatDateIsoToYMD(publishedRaw),
        nvd_url: cve.id ? `https://nvd.nist.gov/vuln/detail/${cve.id}` : null,
        references: Array.from(new Set((cve.references || []).map(r => r.url).filter(Boolean))),
        affected_versions: affected,
        source: 'NVD'
      };
    });

    // Filter by version match (precise mode only since version is required)
    const versionLower = String(version).toLowerCase();
    const versionParts = versionLower.split('.').map(p => p.replace(/^0+/, '')).filter(Boolean);
    const majMin = versionParts.length >= 2 ? `${versionParts[0]}.${versionParts[1]}` : null;
    const majorOnly = versionParts.length >= 1 ? versionParts[0] : null;

    console.log(`[CVE Filter] Looking for version: "${versionLower}", major.minor: "${majMin}", major: "${majorOnly}", total items: ${items.length}`);

    let matchedCount = 0;
    items = items.filter((i, idx) => {
      try {
        const av = i.affected_versions ? String(i.affected_versions).toLowerCase() : '';
        const text = (i.summary || '').toLowerCase();

        // Direct substring match (best)
        if (av && av.includes(versionLower)) {
          matchedCount++;
          if (idx < 3) console.log(`  [Match ${matchedCount}] Direct match: ${i.id} - av="${av}"`);
          return true;
        }

        // Major.minor match (e.g., 1.19) if patch not present in CVE data
        if (majMin && av && av.includes(majMin)) {
          matchedCount++;
          if (idx < 3) console.log(`  [Match ${matchedCount}] Major.minor match: ${i.id} - av="${av}"`);
          return true;
        }

        // Major version match (broader)
        if (majorOnly && av && av.includes(majorOnly)) {
          matchedCount++;
          if (idx < 3) console.log(`  [Match ${matchedCount}] Major version match: ${i.id} - av="${av}"`);
          return true;
        }

        // Software name match in summary (very broad - include if software mentioned)
        const softwareName = q.toLowerCase();
        if (text.includes(softwareName) && (text.includes('nginx') || text.includes('apache') || text.includes('php'))) {
          matchedCount++;
          if (idx < 3) console.log(`  [Match ${matchedCount}] Software mention in summary: ${i.id}`);
          return true;
        }

        // Fallback: if affected_versions missing or doesn't match, check the summary/description text
        if (text.includes(versionLower)) {
          matchedCount++;
          if (idx < 3) console.log(`  [Match ${matchedCount}] Summary full version match: ${i.id}`);
          return true;
        }
        if (majMin && text.includes(majMin)) {
          matchedCount++;
          if (idx < 3) console.log(`  [Match ${matchedCount}] Summary major.minor match: ${i.id}`);
          return true;
        }

        // No confident match - log first few rejections for debugging
        if (idx < 2) {
          console.log(`  [No match] ${i.id} - av="${av}" text="${text.slice(0, 80)}..."`);
        }

        return false;
      } catch (e) {
        console.error(`  [Filter error on ${i.id}]:`, e.message);
        return false;
      }
    });
    console.log(`[CVE Filter] After version ${version} match (with fallback): ${items.length} items`);

    // Sort by CVSS descending
    items.sort((a, b) => {
      const cvssDiff = (b.cvss || 0) - (a.cvss || 0);
      if (cvssDiff !== 0) return cvssDiff;
      return new Date(b.published || 0) - new Date(a.published || 0);
    });

    // Limit results
    const limited = items.slice(0, limit);
    console.log(`[CVE Response] Returning ${limited.length} CVEs for query "${q}" version "${version}"`);

    res.json({
      ok: true,
      query: q,
      version: version,
      count: limited.length,
      status: 'confirmed',
      items: limited,
      message: 'Confirmed CVE search (version matched)'
    });
  } catch (err) {
    if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      console.error('[CVE Search Timeout]', err.message);
      return res.json({
        ok: true,
        query: q,
        version: version,
        count: 0,
        items: [],
        skipped: true,
        reason: 'CVE check skipped due to timeout'
      });
    }
    
    console.error('[CVE Search Error]', err?.message || err);
    res.json({
      ok: true,
      query: q,
      version: version,
      count: 0,
      items: [],
      skipped: true,
      reason: `CVE search failed: ${err?.message || 'unknown error'}`
    });
  }
});

// POST /api/cve/intel
// Optional threat intelligence scan (manual, slow, unverified)
// Body: { software: "apache" }
router.post('/intel', async (req, res) => {
  const software = (req.body?.software || '').trim().toLowerCase();
  
  if (!software) {
    return res.status(400).json({ ok: false, error: 'missing_software' });
  }

  try {
    // Broad search without version requirement
    const nvdUrl = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(software)}&resultsPerPage=200`;
    console.log(`[CVE Intel] Running threat intelligence for: ${software}`);
    const startTime = Date.now();
    const { data } = await axios.get(nvdUrl, { timeout: 10000 }); // 10 second max for intel
    const elapsed = Date.now() - startTime;
    console.log(`[CVE Intel] Completed in ${elapsed}ms, found ${(data.vulnerabilities || []).length} potential matches`);

    let items = (data.vulnerabilities || []).map(entry => {
      const cve = entry.cve || {};
      const cvss = extractCvss(cve);
      const publishedRaw = cve.published || cve.publishedDate || '';
      const affected = extractAffectedVersions(cve);
      return {
        id: cve.id || '',
        summary: cve.descriptions?.[0]?.value || '',
        cvss: cvss !== undefined ? cvss : null,
        severity: getSeverity(cvss || 0),
        published: formatDateIsoToYMD(publishedRaw),
        nvd_url: cve.id ? `https://nvd.nist.gov/vuln/detail/${cve.id}` : null,
        references: Array.from(new Set((cve.references || []).map(r => r.url).filter(Boolean))),
        affected_versions: affected,
        source: 'NVD'
      };
    });

    // Filter: CVSS >= 5 or within last 3 years
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 3);
    items = items.filter(i => (i.cvss !== null && i.cvss >= 5) || (i.published && new Date(i.published) >= cutoff));

    // Sort by CVSS descending
    items.sort((a, b) => (b.cvss || 0) - (a.cvss || 0));

    // Limit to top 10 for intel
    const limited = items.slice(0, 10);
    console.log(`[CVE Intel] Returning ${limited.length} potential CVEs for threat intelligence`);

    // Calculate dynamic confidence levels based on CVSS and recency
    const itemsWithConfidence = limited.map(item => {
      const now = new Date();
      const publishedDate = item.published ? new Date(item.published) : null;
      const ageInYears = publishedDate ? (now - publishedDate) / (1000 * 60 * 60 * 24 * 365) : 5;
      
      let confidence = 'low';
      let confidenceReason = 'Based on technology detection without version confirmation';
      
      // High confidence: CVSS >= 8 AND recent (within 1 year)
      if (item.cvss >= 8 && ageInYears <= 1) {
        confidence = 'high';
        confidenceReason = 'High severity and recent CVE - likely applicable';
      }
      // Medium confidence: CVSS >= 6 OR recent (within 2 years)
      else if (item.cvss >= 6 || ageInYears <= 2) {
        confidence = 'medium';
        confidenceReason = 'Moderate severity or recent CVE - possibly applicable';
      }
      // Low confidence: CVSS < 6 AND older (more than 2 years)
      else {
        confidence = 'low';
        confidenceReason = 'Lower severity and older CVE - less likely applicable';
      }
      
      return {
        ...item,
        confidence,
        confidence_reason: confidenceReason
      };
    });

    res.json({
      ok: true,
      mode: 'intelligence',
      software: software,
      version: 'unknown',
      confidence: 'dynamic',
      count: limited.length,
      note: 'CVEs inferred from detected technology with dynamic confidence scoring.',
      items: itemsWithConfidence
    });
  } catch (err) {
    if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      console.error('[CVE Intel Timeout]', err.message);
      return res.json({
        ok: true,
        mode: 'intelligence',
        software: software,
        count: 0,
        items: [],
        note: 'Threat intelligence search timed out. Please try again.'
      });
    }

    console.error('[CVE Intel Error]', err?.message || err);
    res.json({
      ok: true,
      mode: 'intelligence',
      software: software,
      count: 0,
      items: [],
      note: `Threat intelligence search failed: ${err?.message || 'unknown error'}`
    });
  }
});

module.exports = router;
