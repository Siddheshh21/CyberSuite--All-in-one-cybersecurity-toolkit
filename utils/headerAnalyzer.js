/**
 * HTTP Security Header Analyzer
 * Implements 4-state classification: present_secure, present_weak, deprecated, not_detected
 * Passive analysis only - no exploitation
 */

const crypto = require('crypto');

// Headers to evaluate (exact list from requirements)
const SECURITY_HEADERS = [
  'X-Frame-Options',
  'Strict-Transport-Security',
  'Content-Security-Policy',
  'X-Content-Type-Options',
  'X-XSS-Protection',
  'Referrer-Policy',
  'Permissions-Policy',
  'Set-Cookie',
  'Cross-Origin-Resource-Policy',
  'Cross-Origin-Embedder-Policy',
  'Cross-Origin-Opener-Policy'
];

// Header classification rules
const HEADER_RULES = {
  'X-Frame-Options': {
    present_secure: (value) => {
      const normalized = value?.toLowerCase();
      return normalized === 'sameorigin' || normalized === 'deny';
    },
    present_weak: (value) => {
      const normalized = value?.toLowerCase();
      return normalized && normalized !== 'sameorigin' && normalized !== 'deny';
    },
    deprecated: () => false,
    explanation: 'Prevents clickjacking attacks by controlling iframe embedding',
    recommendation: 'Consider migrating to CSP frame-ancestors directive'
  },
  'Strict-Transport-Security': {
    present_secure: (value) => {
      if (!value) return false;
      const normalized = value.toLowerCase();
      return normalized.includes('max-age=') && 
             (normalized.includes('includeSubDomains') || normalized.includes('includesubdomains')) &&
             (normalized.includes('preload') || parseInt(normalized.match(/max-age=(\d+)/)?.[1]) >= 31536000);
    },
    present_weak: (value) => {
      if (!value) return false;
      const normalized = value.toLowerCase();
      return normalized.includes('max-age=') && 
             !normalized.includes('includeSubDomains') && 
             !normalized.includes('includesubdomains');
    },
    deprecated: () => false,
    explanation: 'Forces HTTPS connections and prevents protocol downgrade attacks',
    recommendation: 'Use max-age=31536000; includeSubDomains; preload for maximum security'
  },
  'Content-Security-Policy': {
    present_secure: (value) => {
      if (!value) return false;
      const normalized = value.toLowerCase();
      // Strong CSP: no unsafe-inline, no unsafe-eval, specific domains
      return !normalized.includes('unsafe-inline') && 
             !normalized.includes('unsafe-eval') &&
             normalized.includes('default-src');
    },
    present_weak: (value) => {
      if (!value) return false;
      const normalized = value.toLowerCase();
      // Weak CSP: contains unsafe directives
      return normalized.includes('unsafe-inline') || 
             normalized.includes('unsafe-eval') ||
             normalized.includes('*') ||
             normalized.includes('data:');
    },
    deprecated: () => false,
    explanation: 'Prevents XSS attacks by controlling resource loading',
    recommendation: 'Use strict CSP without unsafe directives'
  },
  'X-Content-Type-Options': {
    present_secure: (value) => value?.toLowerCase() === 'nosniff',
    present_weak: (value) => value && value.toLowerCase() !== 'nosniff',
    deprecated: () => false,
    explanation: 'Prevents MIME type sniffing attacks',
    recommendation: 'Always set to nosniff'
  },
  'X-XSS-Protection': {
    present_secure: (value) => false, // This header is deprecated
    present_weak: (value) => {
      const normalized = value?.toLowerCase();
      return normalized === '1' || normalized === '1; mode=block';
    },
    deprecated: (value) => {
      const normalized = value?.toLowerCase();
      return normalized === '1' || normalized === '1; mode=block' || normalized === '0';
    },
    explanation: 'Legacy XSS protection header (deprecated by modern browsers)',
    recommendation: 'Remove this header and rely on CSP instead'
  },
  'Referrer-Policy': {
    present_secure: (value) => {
      const secureValues = ['no-referrer', 'same-origin', 'strict-origin', 'strict-origin-when-cross-origin'];
      return secureValues.includes(value?.toLowerCase());
    },
    present_weak: (value) => {
      const weakValues = ['origin', 'origin-when-cross-origin', 'unsafe-url'];
      return weakValues.includes(value?.toLowerCase());
    },
    deprecated: () => false,
    explanation: 'Controls referrer information leakage',
    recommendation: 'Use strict-origin-when-cross-origin or no-referrer'
  },
  'Permissions-Policy': {
    present_secure: (value) => {
      if (!value) return false;
      const normalized = value.toLowerCase();
      // Strong policy: specific origins, no wildcards
      return !normalized.includes('*') && normalized.includes('=(');
    },
    present_weak: (value) => {
      if (!value) return false;
      const normalized = value.toLowerCase();
      // Weak policy: wildcards or overly permissive
      return normalized.includes('*') || normalized.includes('self');
    },
    deprecated: () => false,
    explanation: 'Controls browser feature access (camera, microphone, etc.)',
    recommendation: 'Specify exact origins for sensitive features'
  },
  'Cross-Origin-Resource-Policy': {
    present_secure: (value) => {
      const secureValues = ['same-origin', 'same-site'];
      return secureValues.includes(value?.toLowerCase());
    },
    present_weak: (value) => {
      return value?.toLowerCase() === 'cross-origin';
    },
    deprecated: () => false,
    explanation: 'Prevents cross-origin resource attacks',
    recommendation: 'Use same-origin or same-site for sensitive resources'
  },
  'Cross-Origin-Embedder-Policy': {
    present_secure: (value) => {
      const secureValues = ['require-corp', 'credentialless'];
      return secureValues.includes(value?.toLowerCase());
    },
    present_weak: () => false,
    deprecated: () => false,
    explanation: 'Controls cross-origin embedding',
    recommendation: 'Use require-corp for maximum security'
  },
  'Cross-Origin-Opener-Policy': {
    present_secure: (value) => {
      const secureValues = ['same-origin', 'same-origin-allow-popups'];
      return secureValues.includes(value?.toLowerCase());
    },
    present_weak: (value) => {
      return value?.toLowerCase() === 'unsafe-none';
    },
    deprecated: () => false,
    explanation: 'Isolates browsing contexts',
    recommendation: 'Use same-origin for sensitive applications'
  },
  'Set-Cookie': {
    present_secure: (value) => {
      if (!value) return false;
      const normalized = value.toLowerCase();
      // Secure cookie: has Secure, HttpOnly, SameSite=Strict/Lax
      return normalized.includes('secure') && 
             normalized.includes('httponly') &&
             (normalized.includes('samesite=strict') || normalized.includes('samesite=lax'));
    },
    present_weak: (value) => {
      if (!value) return false;
      const normalized = value.toLowerCase();
      // Weak cookie: missing security attributes
      return !normalized.includes('secure') || 
             !normalized.includes('httponly') ||
             normalized.includes('samesite=none');
    },
    deprecated: () => false,
    explanation: 'Cookie security attributes',
    recommendation: 'Use Secure, HttpOnly, and SameSite=Strict/Lax'
  }
};

/**
 * Analyze HTTP security headers with 4-state classification
 * @param {Object} headers - Raw HTTP headers
 * @param {boolean} isHttps - Whether the connection uses HTTPS
 * @returns {Object} Detailed header analysis
 */
function analyzeHeaders(headers, isHttps = false) {
  const normalized = normalizeHeaders(headers);
  const results = {};
  
  SECURITY_HEADERS.forEach(headerName => {
    const value = normalized[headerName.toLowerCase()];
    const rules = HEADER_RULES[headerName];
    
    if (!rules) {
      results[headerName] = {
        status: 'not_detected',
        detected_value: null,
        severity: 'Informational',
        explanation: 'Header analysis not implemented',
        recommendation: 'No recommendation available'
      };
      return;
    }
    
    let status = 'not_detected';
    let detected_value = value || null;
    
    if (value) {
      if (rules.deprecated && rules.deprecated(value)) {
        status = 'deprecated';
      } else if (rules.present_secure && rules.present_secure(value)) {
        status = 'present_secure';
      } else if (rules.present_weak && rules.present_weak(value)) {
        status = 'present_weak';
      } else {
        status = 'present_weak'; // Default to weak if present but doesn't match secure criteria
      }
    }
    
    results[headerName] = {
      status: status,
      detected_value: detected_value,
      severity: getSeverityForStatus(status),
      explanation: rules.explanation,
      recommendation: status === 'present_secure' ? 'Configuration is secure' : rules.recommendation
    };
  });
  
  return results;
}

/**
 * Get severity level based on header status
 */
function getSeverityForStatus(status) {
  switch (status) {
    case 'present_secure':
      return 'Secure';
    case 'present_weak':
      return 'Medium';
    case 'deprecated':
      return 'High';
    case 'not_detected':
      return 'Informational';
    default:
      return 'Informational';
  }
}

/**
 * Normalize header names to lowercase
 */
function normalizeHeaders(rawHeaders = {}) {
  const out = {};
  for (const [k, v] of Object.entries(rawHeaders)) {
    out[k.toLowerCase()] = v;
    
    // Handle Set-Cookie specially (can have multiple values)
    if (k.toLowerCase() === 'set-cookie' && Array.isArray(v)) {
      out[k.toLowerCase()] = v.join('; ');
    }
  }
  return out;
}

/**
 * Extract CSP from meta tags if present
 */
function extractCspFromMeta(htmlBody) {
  if (!htmlBody) return null;
  const metaMatch = htmlBody.match(/<meta\s+http-equiv\s*=\s*["']?Content-Security-Policy["']?\s+content\s*=\s*["']([^"']+)["']/i);
  return metaMatch ? metaMatch[1] : null;
}

/**
 * Get color coding for frontend display
 */
function getColorForStatus(status) {
  switch (status) {
    case 'present_secure':
      return 'text-green-600';
    case 'present_weak':
      return 'text-yellow-600';
    case 'deprecated':
      return 'text-red-600';
    case 'not_detected':
      return 'text-gray-600';
    default:
      return 'text-gray-600';
  }
}

module.exports = {
  analyzeHeaders,
  normalizeHeaders,
  extractCspFromMeta,
  getColorForStatus,
  SECURITY_HEADERS,
  HEADER_RULES
};