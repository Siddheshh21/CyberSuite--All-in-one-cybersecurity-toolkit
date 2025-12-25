// routes/website.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const sslChecker = require('ssl-checker');
const { analyzeHeaders } = require('../utils/headerAnalyzer');
const { analyzeTLS } = require('../utils/tlsAnalyzer');
const { normalizeWebsiteEntry } = require('../utils/websiteNormalizer');
const { calculateRiskScore } = require('../utils/riskScorer');
const googleSafeBrowsingApiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY || null;

/*
Token definitions (used consistently throughout the codebase):

  present     - header seen in response
  not_detected- header not seen in this response (informational absence)
  missing     - header expected but not returned (only counted for risk when exploitable)
  exposed     - sensitive information revealed (always increases risk)

Only `exposed` and select `missing` states should ever affect risk scoring.
Other tokens are informational and should NOT change the computed risk level.
*/

// Normalize header names to lowercase


// Classify headers by severity and context


// Normalize URL with HTTPS preference
function normalizeUrl(input) {
  try {
    const normalized = normalizeWebsiteEntry(input);
    return {
      original_url: input,
      final_url: normalized.normalized_url,
      protocol_used: normalized.protocol
    };
  } catch (error) {
    throw new Error(`Invalid URL: ${error.message}`);
  }
}

router.post('/scan', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL required' });
    }

    // Initialize scan status tracking
    let scanStatus = 'complete';
    let scanLimitReason = null;
    // activeProtection is set only from GET-time signals. HEAD failures are recorded
    // separately as headProtection so a subsequent successful GET can clear it.
    let activeProtection = false;
    let headProtection = false;

    // Step 0: Normalize URL
    let urlInfo;
    try {
      urlInfo = normalizeUrl(url.trim());
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL', details: e.message });
    }

    console.log(`[Website Scan] Original: ${urlInfo.original_url}, Normalized: ${urlInfo.final_url}`);

    // Step 1: HEAD request to capture redirects
    let redirectChain = [];
    try {
      await axios.head(urlInfo.final_url, {
        timeout: 15000,
        maxRedirects: 10,
        validateStatus: () => true,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CybersuiteBot/1.0)' }
      });
    } catch (err) {
      console.error('HEAD request info:', err.message);
      // HEAD failure could indicate protection, but we should not treat this
      // as definitive protection until GET shows the same behavior. Record
      // it in `headProtection` so GET can decide.
      // NOTE: Do NOT treat timeout (ECONNABORTED) as protection—only explicit rejections.
      if (err.code === 'ECONNRESET' || err.message.includes('socket hang up')) {
        headProtection = true;
        console.log('[Website Scan] HEAD request failed; marking headProtection=true', err.code || err.message);
      }
    }

    // Step 2: GET request to final URL (this is source of truth)
    let finalUrl = urlInfo.final_url;
    let response;
    try {
      response = await axios.get(urlInfo.final_url, {
        timeout: 45000,
        maxRedirects: 10,
        validateStatus: () => true,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CybersuiteBot/1.0)' }
      });

      // Check for 403 immediately after TLS (strong protection signal)
      if (response.status === 403) {
        activeProtection = true;
        scanStatus = 'limited';
        scanLimitReason = 'Target actively blocks automated scanning (WAF/CDN detected)';
        console.log('[Website Scan] Detected active protection: 403 Forbidden');
      }

      // If the GET succeeded, any HEAD-only protection suspicion should be cleared.
      if (headProtection) {
        console.log('[Website Scan] GET succeeded despite HEAD failure; clearing headProtection');
        headProtection = false;
      }

      // Capture final URL after redirects
      try {
        const finalUrlObj = new URL(response.config.url || urlInfo.final_url);
        finalUrl = finalUrlObj.toString();
      } catch {
        finalUrl = urlInfo.final_url;
      }
    } catch (err) {
      console.error('GET request failed:', err.message, 'Code:', err.code);
      
      // Check if it's a timeout (slow/unresponsive server) — treat as limited scan, not error
      if (err.code === 'ETIMEDOUT' || err.message.includes('timeout')) {
        activeProtection = true;
        scanStatus = 'limited';
        scanLimitReason = 'Server did not respond in time (timeout) or rate-limited';
        console.log('[Website Scan] Server timeout detected; marking as limited scan');
      }
      // Detect active protection signals
      else if (err.code === 'ECONNRESET' || err.message.includes('socket hang up') ||
          err.code === 'ERR_TLS_CERT_ALTNAME_INVALID' || err.message.includes('TLS')) {
        activeProtection = true;
        scanStatus = 'limited';
        scanLimitReason = 'Target actively blocks automated scanning (WAF/CDN detected)';
        console.log('[Website Scan] Detected active protection:', err.code || err.message);
      }
      // Check if it's a true DNS/network unreachable error (not timeout)
      else {
        const isDnsOrNetworkError = err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || 
                                    err.message.includes('getaddrinfo');
        if (isDnsOrNetworkError) {
          // Return proper unreachable error format
          return res.status(200).json({
            ok: false,
            error: 'UNREACHABLE_HOST',
            message: 'Domain could not be resolved or is unreachable',
            context: {
              original_url: urlInfo.original_url,
              dns_error: err.code === 'ENOTFOUND' ? 'ENOTFOUND' : 'NETWORK_ERROR'
            }
          });
        }
      }
      
        // If active protection detected, we'll return a limited scan response (continue below)
        // Otherwise it's a real error
        if (!activeProtection) {
          return res.status(502).json({ ok: false, error: 'fetch_failed', message: err.message });
        }
      
        // Create minimal response object for limited scan - no content but mark as limited
        response = {
          status: 999,
          headers: {},
          data: '',
          config: { url: urlInfo.final_url }
        };
    }

    // Determine HTTPS status from final URL only
    let isHttps = false;
    try {
      isHttps = new URL(finalUrl).protocol === 'https:';
    } catch {
      isHttps = finalUrl.toLowerCase().startsWith('https://');
    }

    // Extract hostname for SSL check
    let hostname = '';
    try {
      hostname = new URL(finalUrl).hostname;
    } catch {
      hostname = finalUrl.replace(/^https?:\/\//, '').split(/[\/:]/)[0];
    }

    // Step 3: Get SSL info (only if HTTPS)
    let sslInfo = null;
    if (isHttps && hostname) {
      try {
        sslInfo = await sslChecker(hostname);
        console.log(`SSL info for ${hostname}:`, sslInfo?.valid ? 'valid' : 'invalid');
      } catch (err) {
        console.error('SSL check error:', err.message);
      }
    }

    // Normalize/add extra SSL metadata fields for frontend consumption
    if (sslInfo) {
      const protocol_version = sslInfo.protocol || sslInfo.tlsVersion || null;
      const issuer_name = (sslInfo.issuer && (sslInfo.issuer.organizationName || sslInfo.issuer.commonName)) || sslInfo.issuer || null;
      const wildcard_cert = Array.isArray(sslInfo.altNames) ? sslInfo.altNames.some(n => n.startsWith('*.')) : false;
      sslInfo = Object.assign({}, sslInfo, { protocol_version, issuer_name, wildcard_cert });
    }

    // Step 4: Get Google Safe Browsing status
    let reputation = { status: 'unknown', matches: [] };
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

        if (safeRes.data && safeRes.data.matches && safeRes.data.matches.length > 0) {
          reputation = { status: 'malicious', matches: safeRes.data.matches };
        } else {
          reputation = { status: 'safe', matches: [] };
        }
      } catch (err) {
        console.error('Safe Browsing check failed:', err.message);
      }
    }

    // Step 5: Analyze headers using 4-state classification
    const headerAnalysis = analyzeHeaders(response.headers || {}, isHttps);
    
    // Step 6: Analyze TLS configuration (if HTTPS)
    let tlsAnalysis = null;
    if (isHttps && hostname) {
      try {
        tlsAnalysis = await analyzeTLS(hostname, 443);
      } catch (err) {
        console.error('TLS analysis error:', err.message);
      }
    }
    
    // Step 7: Calculate risk score (excludes missing headers)
    const riskData = {
      headers: headerAnalysis,
      tls: tlsAnalysis,
      cves: { items: [] },
      network: { results: [] },
      reputation: reputation
    };
    const riskScore = calculateRiskScore(riskData);

    // Return comprehensive scan result
    res.json({
      ok: true,
      scan_status: scanStatus,
      scan_limit_reason: scanLimitReason,
      scan_info: {
        original_url: urlInfo.original_url,
        final_url: finalUrl,
        protocol_used: isHttps ? 'https' : 'http',
        status_code: response.status,
        redirect_chain: redirectChain
      },
      https_status: {
        secure: isHttps,
        protocol: isHttps ? 'HTTPS' : 'HTTP',
        note: isHttps ? 'Secure communication enabled' : 'Not using HTTPS'
      },
      ssl: sslInfo,
      tls: tlsAnalysis,
      reputation,
      headers: headerAnalysis,
      raw_headers: response.headers || {},
      context: { active_protection: activeProtection },
      risk_assessment: riskScore,
      limitations: [
        'CDN-based sites may rotate headers by region',
        'Bot protection may alter response headers',
        'Some headers may vary by request method or User-Agent',
        'SSL check relies on public certificate databases'
      ]
    });

  } catch (err) {
    console.error('Website scan error:', err.message);
    res.status(500).json({ ok: false, error: 'internal_error', message: err.message });
  }
});

module.exports = router;
