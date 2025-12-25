/**
 * Website URL Normalizer
 * Normalizes raw input into protocol/host/port format
 * Follows passive scanning principles - no exploitation
 */

const url = require('url');

/**
 * Normalize website entry from various input formats
 * @param {string} input - Raw input (google.com, https://google.com, etc.)
 * @returns {Object} Normalized URL components
 */
function normalizeWebsiteEntry(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid input: URL must be a string');
  }

  const trimmed = input.trim();
  
  // Try to parse as URL first
  try {
    const parsed = new URL(trimmed);
    return {
      protocol: parsed.protocol.replace(':', ''),
      host: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash,
      original_url: trimmed,
      normalized_url: parsed.toString()
    };
  } catch {
    // If direct parsing fails, try with https:// prefix
    try {
      const withProtocol = 'https://' + trimmed;
      const parsed = new URL(withProtocol);
      return {
        protocol: 'https',
        host: parsed.hostname,
        port: 443,
        pathname: parsed.pathname,
        search: parsed.search,
        hash: parsed.hash,
        original_url: trimmed,
        normalized_url: parsed.toString()
      };
    } catch {
      // Try with http:// as fallback
      try {
        const withHttp = 'http://' + trimmed;
        const parsed = new URL(withHttp);
        return {
          protocol: 'http',
          host: parsed.hostname,
          port: 80,
          pathname: parsed.pathname,
          search: parsed.search,
          hash: parsed.hash,
          original_url: trimmed,
          normalized_url: parsed.toString()
        };
      } catch (error) {
        throw new Error(`Invalid URL format: ${error.message}`);
      }
    }
  }
}

/**
 * Extract hostname from various input formats
 * @param {string} input - Raw input
 * @returns {string} Clean hostname
 */
function extractHostname(input) {
  try {
    const normalized = normalizeWebsiteEntry(input);
    return normalized.host;
  } catch {
    // Fallback: simple hostname extraction
    const cleaned = input.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const parts = cleaned.split(':');
    return parts[0];
  }
}

/**
 * Determine if URL uses HTTPS
 * @param {string} input - Raw input
 * @returns {boolean} True if HTTPS
 */
function isHttps(input) {
  try {
    const normalized = normalizeWebsiteEntry(input);
    return normalized.protocol === 'https';
  } catch {
    return input.startsWith('https://');
  }
}

/**
 * Get port number from URL
 * @param {string} input - Raw input
 * @returns {number} Port number
 */
function getPort(input) {
  try {
    const normalized = normalizeWebsiteEntry(input);
    return normalized.port;
  } catch {
    return input.startsWith('https://') ? 443 : 80;
  }
}

/**
 * Validate URL format
 * @param {string} input - Raw input
 * @returns {boolean} True if valid
 */
function isValidUrl(input) {
  try {
    normalizeWebsiteEntry(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clean and sanitize URL for display
 * @param {string} input - Raw input
 * @returns {string} Clean URL for display
 */
function sanitizeForDisplay(input) {
  try {
    const normalized = normalizeWebsiteEntry(input);
    return `${normalized.protocol}://${normalized.host}`;
  } catch {
    return input.replace(/[^a-zA-Z0-9:\/\.-]/g, '');
  }
}

module.exports = {
  normalizeWebsiteEntry,
  extractHostname,
  isHttps,
  getPort,
  isValidUrl,
  sanitizeForDisplay
};