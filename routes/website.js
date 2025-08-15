// routes/website.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const sslChecker = require('ssl-checker');  // Import ssl-checker for SSL/TLS details

// Google Safe Browsing API key from environment variables
const googleSafeBrowsingApiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;  // Google Safe Browsing key

// Helper: normalize header names to lowercase keys
function normalizeHeaders(rawHeaders) {
  const h = {};
  for (const key of Object.keys(rawHeaders || {})) {
    h[key.toLowerCase()] = rawHeaders[key];
  }
  return h;
}

// Simple checks and friendly messages
function analyzeHeaders(headers, url) {
  const results = {};
  results.https = url.startsWith('https');
  results.server = headers['server'] || null;
  results.content_security_policy = headers['content-security-policy'] || null;
  results.hsts = headers['strict-transport-security'] || null;
  results.x_frame_options = headers['x-frame-options'] || null;
  results.x_content_type_options = headers['x-content-type-options'] || null;
  results.referrer_policy = headers['referrer-policy'] || null;
  results.cors = headers['access-control-allow-origin'] || null;

  // Friendly advice list
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

router.post('/scan', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      console.error('Invalid URL received:', url);  // Log invalid URL
      return res.status(400).json({ error: 'URL required (e.g. https://example.com)' });
    }

    // Normalize URL
    let target = url.trim();

    // Remove the protocol (http:// or https://) from the URL for DNS lookup
    if (/^https?:\/\//i.test(target)) {
      target = target.replace(/^https?:\/\//, '');  // Remove 'http://' or 'https://'
    }

    console.log('Scanning URL:', target);  // Log the URL being scanned

    // Step 1: Try to GET the page (to read headers)
    let response;
    try {
      response = await axios.get('https://' + target, {  // Re-append https:// to make the request
        timeout: 30000,  // Increased timeout to 30 seconds (30000ms)
        maxRedirects: 5,
        validateStatus: () => true,  // Accept all status codes
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CybersuiteBot/1.0)' }  // Set User-Agent to avoid blocks
      });
      console.log('Response received for URL:', target);  // Log response success
    } catch (err) {
      console.error('Error during fetch:', err.message);  // Log fetch error
      console.error('Error details:', err);  // Log the full error details
      return res.status(502).json({ ok: false, error: 'fetch_failed', message: err.message });
    }

    const headers = normalizeHeaders(response.headers);
    const analyzed = analyzeHeaders(headers, target);

    // Step 2: Fetch SSL/TLS information using ssl-checker
    let sslInfo;
    try {
      sslInfo = await sslChecker(target);  // SSL check still uses the domain name
      console.log('SSL Info:', sslInfo);  // Log SSL info
    } catch (err) {
      console.error('Error during SSL check:', err.message);  // Log SSL check error
      return res.status(502).json({ ok: false, error: 'ssl_check_failed', message: err.message });
    }

    // Google Safe Browsing Reputation Check
    let reputation = 'unknown';

    try {
      const safeBrowsingPayload = {
        client: {
          clientId: 'cybersuite',
          clientVersion: '1.0'
        },
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'], // ✅ MUST include this
          threatEntries: [
            { url: target } // ✅ This should be inside an array, not a single object
          ]
        }
      };

      const safeBrowsingResponse = await axios.post(
        `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${googleSafeBrowsingApiKey}`,
        safeBrowsingPayload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // ✅ If matches returned, it's unsafe
      if (safeBrowsingResponse.data && safeBrowsingResponse.data.matches) {
        reputation = 'malicious';
      } else {
        reputation = 'safe';
      }

    } catch (err) {
      console.error('Error during reputation check:', err.message);
      return res.status(502).json({
        ok: false,
        error: 'reputation_check_failed',
        message: err.message
      });
    }

    // Optional: Basic TLS/SSL quick info using headers and protocol
    const quick = {
      status_code: response.status,
      final_url: response.request ? (response.request.res && response.request.res.responseUrl) || target : target
    };

    // Send response with SSL details, headers analysis, and reputation info
    res.json({
      ok: true,
      quick,
      ssl: sslInfo,  // Include SSL details
      reputation,  // Website reputation info from Google Safe Browsing
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
    console.error('Website scan error', err);  // Log general errors
    res.status(500).json({ ok: false, error: 'internal_error', message: err.message });
  }
});

module.exports = router;
