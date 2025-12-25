/**
 * SSL/TLS Security Analyzer
 * Passive analysis of TLS configuration, certificates, and vulnerabilities
 * Uses Node.js built-in TLS module and OpenSSL-style analysis
 */

const tls = require('tls');
const crypto = require('crypto');
const { promisify } = require('util');

/**
 * TLS Vulnerability Detection Rules
 * Based on configuration analysis, not exploitation
 */
const TLS_VULNERABILITIES = {
  'Heartbleed': {
    cve: 'CVE-2014-0160',
    detection: (tlsInfo) => {
      // Check OpenSSL version ranges
      const version = tlsInfo.openssl_version || '';
      const vulnerableVersions = ['1.0.1', '1.0.1a', '1.0.1b', '1.0.1c', '1.0.1d', '1.0.1e', '1.0.1f'];
      return vulnerableVersions.some(v => version.includes(v));
    },
    severity: 'Critical',
    description: 'OpenSSL heartbeat extension buffer over-read'
  },
  'CRIME': {
    cve: 'CVE-2012-4929',
    detection: (tlsInfo) => {
      // Check if TLS compression is enabled
      return tlsInfo.compression_enabled === true;
    },
    severity: 'High',
    description: 'TLS compression allows information leakage'
  },
  'DROWN': {
    cve: 'CVE-2016-0800',
    detection: (tlsInfo) => {
      // Check if SSLv2 is supported
      return tlsInfo.sslv2_enabled === true;
    },
    severity: 'High',
    description: 'SSLv2 vulnerability allows decryption of TLS connections'
  },
  'BEAST': {
    cve: 'CVE-2011-3389',
    detection: (tlsInfo) => {
      // Check for TLS 1.0 with CBC ciphers
      return tlsInfo.tls10_enabled === true && 
             tlsInfo.cipher_suites?.some(cipher => cipher.includes('CBC'));
    },
    severity: 'Medium',
    description: 'TLS 1.0 CBC cipher vulnerability'
  },
  'Lucky13': {
    cve: 'CVE-2013-0169',
    detection: (tlsInfo) => {
      // Check for CBC ciphers with MAC-then-Encrypt
      return tlsInfo.cipher_suites?.some(cipher => 
        cipher.includes('CBC') && 
        (cipher.includes('SHA') || cipher.includes('MD5'))
      );
    },
    severity: 'Medium',
    description: 'CBC cipher timing attack'
  },
  'Ticketbleed': {
    cve: 'CVE-2016-9244',
    detection: (tlsInfo) => {
      // Check for F5 BIG-IP signatures
      return tlsInfo.server_software?.toLowerCase().includes('big-ip') ||
             tlsInfo.session_ticket?.length > 256;
    },
    severity: 'Medium',
    description: 'F5 BIG-IP session ticket vulnerability'
  },
  'Fallback SCSV': {
    cve: 'CVE-2014-3566',
    detection: (tlsInfo) => {
      // Check for missing downgrade protection
      return tlsInfo.fallback_scsv_enabled === false;
    },
    severity: 'Medium',
    description: 'Missing TLS fallback protection'
  },
  'POODLE': {
    cve: 'CVE-2014-3566',
    detection: (tlsInfo) => {
      // Check for SSLv3 support
      return tlsInfo.sslv3_enabled === true;
    },
    severity: 'High',
    description: 'SSLv3 padding oracle vulnerability'
  },
  'FREAK': {
    cve: 'CVE-2015-0204',
    detection: (tlsInfo) => {
      // Check for export-grade ciphers
      return tlsInfo.cipher_suites?.some(cipher => 
        cipher.includes('EXPORT') || cipher.includes('RSA_EXPORT')
      );
    },
    severity: 'High',
    description: 'Export-grade cipher vulnerability'
  },
  'SWEET32': {
    cve: 'CVE-2016-2183',
    detection: (tlsInfo) => {
      // Check for 64-bit block ciphers (3DES, DES)
      return tlsInfo.cipher_suites?.some(cipher => 
        cipher.includes('3DES') || cipher.includes('DES') || cipher.includes('IDEA')
      );
    },
    severity: 'Medium',
    description: '64-bit block cipher birthday attack'
  }
};

/**
 * Cipher suite classification
 */
const CIPHER_STRENGTH = {
  strong: [
    'AES-256-GCM', 'AES-128-GCM', 'CHACHA20-POLY1305',
    'AES-256-CCM', 'AES-128-CCM'
  ],
  weak: [
    'AES-256-CBC', 'AES-128-CBC', '3DES', 'DES', 'IDEA',
    'RC4', 'SEED', 'CAMELLIA'
  ],
  deprecated: [
    'EXPORT', 'RC4', 'DES', '3DES', 'MD5', 'SHA1'
  ]
};

/**
 * Analyze SSL/TLS configuration
 */
async function analyzeTLS(hostname, port = 443) {
  return new Promise((resolve) => {
    const tlsInfo = {
      hostname,
      port,
      certificate: null,
      tls_versions: {},
      cipher_suites: [],
      vulnerabilities: [],
      openssl_version: null,
      compression_enabled: false,
      session_ticket: null,
      fallback_scsv_enabled: false,
      server_software: null
    };

    try {
      // Test different TLS versions
      const tlsTests = [
        { version: 'TLSv1_3', method: 'TLSv1_3_method' },
        { version: 'TLSv1_2', method: 'TLSv1_2_method' },
        { version: 'TLSv1_1', method: 'TLSv1_1_method' },
        { version: 'TLSv1', method: 'TLSv1_method' }
      ];

      // Test each TLS version
      tlsTests.forEach(test => {
        try {
          const socket = tls.connect({
            host: hostname,
            port: port,
            rejectUnauthorized: false,
            minVersion: test.version.toLowerCase().replace('_', '.'),
            maxVersion: test.version.toLowerCase().replace('_', '.')
          }, () => {
            tlsInfo.tls_versions[test.version] = 'enabled';
            
            // Get cipher info
            const cipher = socket.getCipher();
            if (cipher && !tlsInfo.cipher_suites.includes(cipher.name)) {
              tlsInfo.cipher_suites.push(cipher.name);
            }
            
            socket.destroy();
          });

          socket.setTimeout(5000, () => {
            socket.destroy();
            if (!tlsInfo.tls_versions[test.version]) {
              tlsInfo.tls_versions[test.version] = 'disabled';
            }
          });

          socket.on('error', () => {
            tlsInfo.tls_versions[test.version] = 'disabled';
          });

        } catch (e) {
          tlsInfo.tls_versions[test.version] = 'disabled';
        }
      });

      // Get certificate details
      const certSocket = tls.connect({
        host: hostname,
        port: port,
        rejectUnauthorized: false
      }, () => {
        const cert = certSocket.getPeerCertificate();
        const cipher = certSocket.getCipher();
        
        if (cert) {
          tlsInfo.certificate = {
            valid: cert.valid_from && cert.valid_to ? 
              new Date(cert.valid_to) > new Date() : null,
            issuer: cert.issuer ? cert.issuer.O || cert.issuer.CN : null,
            subject: cert.subject ? cert.subject.CN : null,
            expires_on: cert.valid_to,
            days_remaining: cert.valid_to ? 
              Math.floor((new Date(cert.valid_to) - new Date()) / (1000 * 60 * 60 * 24)) : null,
            alt_names: cert.subjectaltname ? 
              cert.subjectaltname.split(', ').map(name => name.replace('DNS:', '')) : []
          };
        }
        
        if (cipher) {
          tlsInfo.cipher_suites.push(cipher.name);
        }
        
        certSocket.destroy();
      });

      certSocket.setTimeout(10000, () => {
        certSocket.destroy();
      });

      certSocket.on('error', (err) => {
        console.error('TLS analysis error:', err.message);
      });

      certSocket.on('close', () => {
        // Analyze vulnerabilities
        tlsInfo.vulnerabilities = analyzeVulnerabilities(tlsInfo);
        resolve(tlsInfo);
      });

    } catch (error) {
      console.error('TLS analysis failed:', error.message);
      resolve(tlsInfo);
    }
  });
}

/**
 * Analyze TLS vulnerabilities based on configuration
 */
function analyzeVulnerabilities(tlsInfo) {
  const vulnerabilities = [];
  
  Object.entries(TLS_VULNERABILITIES).forEach(([name, vuln]) => {
    try {
      if (vuln.detection(tlsInfo)) {
        vulnerabilities.push({
          name: name,
          cve: vuln.cve,
          status: 'vulnerable',
          severity: vuln.severity,
          description: vuln.description
        });
      } else {
        vulnerabilities.push({
          name: name,
          cve: vuln.cve,
          status: 'not_vulnerable',
          severity: 'ok',
          description: vuln.description
        });
      }
    } catch (e) {
      console.error(`Error checking ${name}:`, e.message);
    }
  });
  
  return vulnerabilities;
}

/**
 * Classify cipher suite strength
 */
function classifyCipherSuite(cipherName) {
  if (!cipherName) return 'unknown';
  
  const upperName = cipherName.toUpperCase();
  
  // Check for deprecated ciphers
  if (CIPHER_STRENGTH.deprecated.some(deprecated => upperName.includes(deprecated))) {
    return 'deprecated';
  }
  
  // Check for strong ciphers
  if (CIPHER_STRENGTH.strong.some(strong => upperName.includes(strong))) {
    return 'strong';
  }
  
  // Check for weak ciphers
  if (CIPHER_STRENGTH.weak.some(weak => upperName.includes(weak))) {
    return 'weak';
  }
  
  // Default classification based on common patterns
  if (upperName.includes('GCM') || upperName.includes('CCM') || upperName.includes('POLY1305')) {
    return 'strong';
  }
  
  if (upperName.includes('CBC')) {
    return 'weak';
  }
  
  if (upperName.includes('EXPORT') || upperName.includes('RC4')) {
    return 'deprecated';
  }
  
  return 'unknown';
}

/**
 * Get color coding for frontend display
 */
function getColorForStatus(status) {
  switch (status) {
    case 'strong':
    case 'not_vulnerable':
      return 'text-green-600';
    case 'weak':
      return 'text-yellow-600';
    case 'deprecated':
    case 'vulnerable':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

module.exports = {
  analyzeTLS,
  classifyCipherSuite,
  getColorForStatus,
  TLS_VULNERABILITIES,
  CIPHER_STRENGTH
};