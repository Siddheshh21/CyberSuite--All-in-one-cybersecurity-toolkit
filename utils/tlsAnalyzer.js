const https = require('https');
const tls = require('tls');
const net = require('net');

/**
 * TLS Configuration Analyzer
 * Analyzes TLS configuration, versions, cipher suites, and vulnerabilities
 */

// TLS vulnerability detection rules
const TLS_VULNERABILITIES = {
  Heartbleed: {
    name: 'Heartbleed',
    cve: 'CVE-2014-0160',
    detection: (tlsData) => {
      // Check if OpenSSL version is vulnerable (1.0.1 through 1.0.1f)
      if (tlsData.openssl_version) {
        const version = tlsData.openssl_version;
        return version.includes('1.0.1') && !version.includes('1.0.1g');
      }
      return false;
    },
    severity: 'critical'
  },
  CRIME: {
    name: 'CRIME',
    cve: 'CVE-2012-4929',
    detection: (tlsData) => {
      // Check if TLS compression is enabled
      return tlsData.compression_enabled === true;
    },
    severity: 'high'
  },
  DROWN: {
    name: 'DROWN',
    cve: 'CVE-2016-0800',
    detection: (tlsData) => {
      // Check if SSLv2 is supported
      return tlsData.tls_versions && tlsData.tls_versions['SSLv2'] === 'enabled';
    },
    severity: 'critical'
  },
  BEAST: {
    name: 'BEAST',
    cve: 'CVE-2011-3389',
    detection: (tlsData) => {
      // Check if TLS 1.0 is enabled with CBC ciphers
      if (tlsData.tls_versions && tlsData.tls_versions['TLS1.0'] === 'enabled') {
        return tlsData.cipher_suites && tlsData.cipher_suites.some(cipher => 
          cipher.cipher.includes('CBC') && !cipher.cipher.includes('GCM')
        );
      }
      return false;
    },
    severity: 'medium'
  },
  Lucky13: {
    name: 'Lucky13',
    cve: 'CVE-2013-0169',
    detection: (tlsData) => {
      // Check for CBC cipher suites (timing attack)
      return tlsData.cipher_suites && tlsData.cipher_suites.some(cipher => 
        cipher.cipher.includes('CBC') && !cipher.cipher.includes('GCM')
      );
    },
    severity: 'medium'
  },
  Ticketbleed: {
    name: 'Ticketbleed',
    cve: 'CVE-2016-9244',
    detection: (tlsData) => {
      // Check for F5 BIG-IP signature in server software
      return tlsData.server_software && tlsData.server_software.includes('BIG-IP');
    },
    severity: 'high'
  },
  FallbackSCSV: {
    name: 'Fallback SCSV',
    detection: (tlsData) => {
      // Check if TLS_FALLBACK_SCSV is not supported
      return tlsData.fallback_scsv_enabled === false;
    },
    severity: 'medium'
  },
  POODLE: {
    name: 'POODLE',
    cve: 'CVE-2014-3566',
    detection: (tlsData) => {
      // Check if SSLv3 is supported
      return tlsData.tls_versions && tlsData.tls_versions['SSLv3'] === 'enabled';
    },
    severity: 'high'
  },
  FREAK: {
    name: 'FREAK',
    cve: 'CVE-2015-0204',
    detection: (tlsData) => {
      // Check for export-grade cipher suites
      return tlsData.cipher_suites && tlsData.cipher_suites.some(cipher => 
        cipher.cipher.includes('EXPORT')
      );
    },
    severity: 'high'
  },
  SWEET32: {
    name: 'SWEET32',
    cve: 'CVE-2016-2183',
    detection: (tlsData) => {
      // Check for 64-bit block ciphers (3DES, RC2)
      return tlsData.cipher_suites && tlsData.cipher_suites.some(cipher => 
        cipher.cipher.includes('3DES') || cipher.cipher.includes('RC2')
      );
    },
    severity: 'medium'
  }
};

// Cipher suite classification
function classifyCipherSuite(cipher) {
  const cipherUpper = cipher.toUpperCase();
  
  // Strong ciphers
  if (cipherUpper.includes('AES_256_GCM') || cipherUpper.includes('AES_128_GCM') ||
      cipherUpper.includes('CHACHA20_POLY1305') || cipherUpper.includes('AES_256_CCM') ||
      cipherUpper.includes('AES_128_CCM')) {
    return 'strong';
  }
  
  // Weak ciphers
  if (cipherUpper.includes('RC4') || cipherUpper.includes('DES') || 
      cipherUpper.includes('EXPORT') || cipherUpper.includes('NULL') ||
      cipherUpper.includes('MD5') || cipherUpper.includes('SHA1')) {
    return 'weak';
  }
  
  // Deprecated but not immediately weak
  if (cipherUpper.includes('CBC') && !cipherUpper.includes('GCM')) {
    return 'deprecated';
  }
  
  // Default to medium
  return 'medium';
}

// Check if cipher supports forward secrecy
function hasForwardSecrecy(cipher) {
  const cipherUpper = cipher.toUpperCase();
  return cipherUpper.includes('ECDHE') || cipherUpper.includes('DHE') || cipherUpper.includes('CHACHA20');
}

/**
 * Analyze TLS configuration for a given hostname and port
 * @param {string} hostname - The hostname to analyze
 * @param {number} port - The port to connect to (default 443)
 * @returns {Promise<Object>} TLS analysis results
 */
async function analyzeTLS(hostname, port = 443) {
  try {
    const tlsData = {
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

    // Test TLS versions
    const tlsVersions = ['TLSv1.3', 'TLSv1.2', 'TLSv1.1', 'TLSv1.0'];
    for (const version of tlsVersions) {
      try {
        await testTLSVersion(hostname, port, version);
        tlsData.tls_versions[version.replace('.', '')] = 'enabled';
      } catch (err) {
        tlsData.tls_versions[version.replace('.', '')] = 'disabled';
      }
    }

    // Get detailed TLS connection info
    const detailedInfo = await getDetailedTLSInfo(hostname, port);
    if (detailedInfo) {
      tlsData.cipher_suites = detailedInfo.cipher_suites || [];
      tlsData.certificate = detailedInfo.certificate;
      tlsData.compression_enabled = detailedInfo.compression_enabled;
      tlsData.session_ticket = detailedInfo.session_ticket;
      tlsData.fallback_scsv_enabled = detailedInfo.fallback_scsv_enabled;
      tlsData.server_software = detailedInfo.server_software;
    }

    // Analyze vulnerabilities
    tlsData.vulnerabilities = analyzeVulnerabilities(tlsData);

    return tlsData;
  } catch (error) {
    console.error('TLS analysis error:', error.message);
    return {
      hostname,
      port,
      error: error.message,
      certificate: null,
      tls_versions: {},
      cipher_suites: [],
      vulnerabilities: []
    };
  }
}

/**
 * Test if a specific TLS version is supported
 */
function testTLSVersion(hostname, port, version) {
  return new Promise((resolve, reject) => {
    const options = {
      host: hostname,
      port: port,
      rejectUnauthorized: false,
      timeout: 5000
    };

    // Set minimum TLS version
    if (version === 'TLSv1.3') {
      options.minVersion = 'TLSv1.3';
      options.maxVersion = 'TLSv1.3';
    } else if (version === 'TLSv1.2') {
      options.minVersion = 'TLSv1.2';
      options.maxVersion = 'TLSv1.2';
    } else if (version === 'TLSv1.1') {
      options.minVersion = 'TLSv1.1';
      options.maxVersion = 'TLSv1.1';
    } else if (version === 'TLSv1.0') {
      options.minVersion = 'TLSv1';
      options.maxVersion = 'TLSv1';
    }

    const socket = tls.connect(options, () => {
      socket.end();
      resolve(true);
    });

    socket.on('error', (err) => {
      reject(err);
    });

    socket.setTimeout(5000, () => {
      socket.destroy();
      reject(new Error('Timeout'));
    });
  });
}

/**
 * Get detailed TLS connection information
 */
function getDetailedTLSInfo(hostname, port) {
  return new Promise((resolve) => {
    const options = {
      host: hostname,
      port: port,
      rejectUnauthorized: false,
      timeout: 5000
    };

    const socket = tls.connect(options, () => {
      const cipher = socket.getCipher();
      const cert = socket.getPeerCertificate();
      
      const cipherSuites = [{
        cipher: cipher.name,
        strength: classifyCipherSuite(cipher.name),
        forward_secrecy: hasForwardSecrecy(cipher.name),
        version: cipher.version
      }];

      const result = {
        cipher_suites: cipherSuites,
        certificate: {
          valid: true,
          issuer: cert.issuer ? cert.issuer.O || cert.issuer.CN : 'Unknown',
          subject: cert.subject ? cert.subject.CN : 'Unknown',
          expires_on: cert.valid_to,
          days_remaining: Math.floor((new Date(cert.valid_to) - new Date()) / (1000 * 60 * 60 * 24))
        },
        compression_enabled: false, // Node.js doesn't enable compression by default
        session_ticket: null,
        fallback_scsv_enabled: false,
        server_software: null
      };

      socket.end();
      resolve(result);
    });

    socket.on('error', (err) => {
      resolve(null);
    });

    socket.setTimeout(5000, () => {
      socket.destroy();
      resolve(null);
    });
  });
}

/**
 * Analyze TLS vulnerabilities based on configuration
 */
function analyzeVulnerabilities(tlsData) {
  const vulnerabilities = [];
  
  for (const [key, vuln] of Object.entries(TLS_VULNERABILITIES)) {
    try {
      const isVulnerable = vuln.detection(tlsData);
      vulnerabilities.push({
        name: vuln.name,
        cve: vuln.cve || null,
        status: isVulnerable ? 'vulnerable' : 'not_vulnerable',
        severity: isVulnerable ? vuln.severity : 'ok'
      });
    } catch (error) {
      console.error(`Error checking ${vuln.name}:`, error.message);
    }
  }
  
  return vulnerabilities;
}

module.exports = {
  analyzeTLS,
  classifyCipherSuite,
  hasForwardSecrecy,
  TLS_VULNERABILITIES
};