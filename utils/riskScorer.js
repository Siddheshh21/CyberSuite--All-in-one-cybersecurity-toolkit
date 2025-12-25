/**
 * Risk Scoring Engine
 * Calculates overall risk based on exploitable findings only
 * Missing headers are informational and do NOT affect risk score
 */

/**
 * Risk scoring configuration
 * Only exploitable findings affect the risk score
 */
const RISK_WEIGHTS = {
  // Critical vulnerabilities (always count)
  critical_cve: 10,
  high_cve: 8,
  medium_cve: 5,
  
  // TLS vulnerabilities
  tls_critical: 8,
  tls_high: 6,
  tls_medium: 3,
  
  // Network exposures
  dangerous_port: 4,
  admin_service: 6,
  
  // Header exposures (not missing headers)
  server_exposed: 2,
  sensitive_header: 3,
  
  // Malware flags
  malware_flag: 10,
  phishing_flag: 10,
  
  // Informational items (do NOT affect risk)
  missing_header: 0,
  weak_header: 0,
  deprecated_header: 0
};

/**
 * Calculate overall risk score
 * @param {Object} scanData - Complete scan results
 * @returns {Object} Risk assessment
 */
function calculateRiskScore(scanData) {
  let exploitableFindings = 0;
  let informationalObservations = 0;
  let riskPoints = 0;
  
  // Analyze CVE findings
  if (scanData.cves && scanData.cves.items) {
    scanData.cves.items.forEach(cve => {
      if (cve.severity === 'Critical') {
        exploitableFindings++;
        riskPoints += RISK_WEIGHTS.critical_cve;
      } else if (cve.severity === 'High') {
        exploitableFindings++;
        riskPoints += RISK_WEIGHTS.high_cve;
      } else if (cve.severity === 'Medium') {
        exploitableFindings++;
        riskPoints += RISK_WEIGHTS.medium_cve;
      }
    });
  }
  
  // Analyze TLS vulnerabilities
  if (scanData.tls && scanData.tls.vulnerabilities) {
    scanData.tls.vulnerabilities.forEach(vuln => {
      if (vuln.status === 'vulnerable') {
        exploitableFindings++;
        if (vuln.severity === 'Critical') {
          riskPoints += RISK_WEIGHTS.tls_critical;
        } else if (vuln.severity === 'High') {
          riskPoints += RISK_WEIGHTS.tls_high;
        } else if (vuln.severity === 'Medium') {
          riskPoints += RISK_WEIGHTS.tls_medium;
        }
      }
    });
  }
  
  // Analyze network exposures
  if (scanData.network && scanData.network.results) {
    scanData.network.results.forEach(port => {
      if (port.state === 'open') {
        const portNum = parseInt(port.port);
        
        // Dangerous ports
        if ([22, 23, 135, 139, 445, 1433, 3306, 3389].includes(portNum)) {
          exploitableFindings++;
          riskPoints += RISK_WEIGHTS.dangerous_port;
        }
        
        // Admin services
        if ([22, 3389, 5900, 5800].includes(portNum)) {
          exploitableFindings++;
          riskPoints += RISK_WEIGHTS.admin_service;
        }
      }
    });
  }
  
  // Analyze reputation/malware flags
  if (scanData.reputation && scanData.reputation.matches) {
    scanData.reputation.matches.forEach(match => {
      exploitableFindings++;
      if (match.threatType === 'MALWARE') {
        riskPoints += RISK_WEIGHTS.malware_flag;
      } else if (match.threatType === 'SOCIAL_ENGINEERING') {
        riskPoints += RISK_WEIGHTS.phishing_flag;
      }
    });
  }
  
  // Analyze headers (only exposures, not missing headers)
  if (scanData.headers) {
    Object.values(scanData.headers).forEach(header => {
      if (header.status === 'exposed') {
        exploitableFindings++;
        riskPoints += RISK_WEIGHTS.server_exposed;
      } else if (header.status === 'deprecated') {
        exploitableFindings++;
        riskPoints += RISK_WEIGHTS.sensitive_header;
      }
      // Missing headers are informational and do NOT count
      else if (header.status === 'not_detected' || header.status === 'present_weak') {
        informationalObservations++;
      }
    });
  }
  
  // Determine risk level
  let overallRisk = 'Low';
  let confidence = 'High';
  
  if (riskPoints >= 20) {
    overallRisk = 'Critical';
    confidence = 'High';
  } else if (riskPoints >= 15) {
    overallRisk = 'High';
    confidence = 'High';
  } else if (riskPoints >= 8) {
    overallRisk = 'Medium';
    confidence = 'High';
  } else if (riskPoints >= 3) {
    overallRisk = 'Low';
    confidence = 'Medium';
  }
  
  // If no exploitable findings, it's always Low risk regardless of observations
  if (exploitableFindings === 0) {
    overallRisk = 'Low';
    confidence = 'High';
  }
  
  return {
    overall_risk: overallRisk,
    exploitable_findings: exploitableFindings,
    informational_observations: informationalObservations,
    risk_points: riskPoints,
    confidence: confidence,
    breakdown: {
      cve_findings: scanData.cves?.items?.length || 0,
      tls_vulnerabilities: scanData.tls?.vulnerabilities?.filter(v => v.status === 'vulnerable').length || 0,
      network_exposures: scanData.network?.results?.filter(p => p.state === 'open').length || 0,
      malware_flags: scanData.reputation?.matches?.length || 0,
      header_exposures: Object.values(scanData.headers || {}).filter(h => h.status === 'exposed').length || 0
    }
  };
}

/**
 * Get risk color for frontend
 */
function getRiskColor(riskLevel) {
  switch (riskLevel.toLowerCase()) {
    case 'critical':
      return 'text-red-800 bg-red-100';
    case 'high':
      return 'text-red-600 bg-red-50';
    case 'medium':
      return 'text-yellow-600 bg-yellow-50';
    case 'low':
      return 'text-green-600 bg-green-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

/**
 * Validate risk score inputs
 */
function validateRiskInputs(scanData) {
  if (!scanData || typeof scanData !== 'object') {
    throw new Error('Invalid scan data: must be an object');
  }
  
  return true;
}

module.exports = {
  calculateRiskScore,
  getRiskColor,
  validateRiskInputs,
  RISK_WEIGHTS
};