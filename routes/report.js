const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');

router.post('/generate', (req, res) => {
  try {
    const reportData = req.body;
    if (!reportData) {
      return res.status(400).json({ ok: false, error: 'Report data required' });
    }

  const doc = new PDFDocument({ margin: 50 });
  
  // Helper function to add section header
  function addSectionHeader(title, color = '#0a192f') {
    doc.fontSize(18).fillColor(color).font('Helvetica-Bold').text(title, { width: doc.page.width - 100 });
    doc.moveDown(0.5);
  }
  
  // Helper function to add subsection
  function addSubsection(title, content, indent = 0) {
    doc.fontSize(13).fillColor('#0a192f').font('Helvetica-Bold').text(title, indent, doc.y);
    doc.moveDown(0.2);
    if (typeof content === 'string') {
      doc.fontSize(11).fillColor('#555').font('Helvetica').text(content, indent + 20, doc.y, { 
        width: doc.page.width - 100 - indent,
        align: 'justify'
      });
    }
    doc.moveDown(0.5);
  }
  
  // Helper function to add bullet point
  function addBulletPoint(text, indent = 20) {
    doc.fontSize(11).fillColor('#555').font('Helvetica')
      .text('•', indent, doc.y, { continued: true })
      .text(` ${text}`, indent + 10, doc.y, { 
        width: doc.page.width - 100 - indent,
        indent: 20
      });
  }

  // Header with gradient background
  doc.rect(0, 0, doc.page.width, 100).fill('#0a192f');
  doc.fillColor('#fff')
    .font('Helvetica-Bold')
    .fontSize(28)
    .text('Cyber Suite Security Assessment Report', 50, 30, { 
      align: 'center',
      width: doc.page.width - 100
    });
  doc.fontSize(12)
    .text('Comprehensive Security Analysis & Recommendations', 50, 100, { 
      align: 'center',
      width: doc.page.width - 100
    });
  
  doc.moveDown(3);
  doc.font('Helvetica');
  doc.fillColor('#333');

  // Set response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=cybersuite-security-report.pdf');
  doc.pipe(res);

  // Executive Summary
  addSectionHeader('Executive Summary');
  
  // Basic Information
  doc.fontSize(12).fillColor('#444')
    .font('Helvetica-Bold').text('Target URL:', { continued: true })
    .font('Helvetica').text(` ${reportData.url || 'N/A'}`, { width: doc.page.width - 100 });
  
  doc.font('Helvetica-Bold').text('Scan Date:', { continued: true })
    .font('Helvetica').text(` ${new Date().toLocaleString()}`, { width: doc.page.width - 100 });
  
  doc.font('Helvetica-Bold').text('Scan Status:', { continued: true })
    .font('Helvetica').text(` ${reportData.scan_status || 'Complete'}`, { width: doc.page.width - 100 });
  
  // Risk Assessment Summary - REMOVED
  /* if (reportData.findings && Array.isArray(reportData.findings)) {
    const critical = reportData.findings.filter(f => f.severity === 'Critical').length;
    const high = reportData.findings.filter(f => f.severity === 'High').length;
    const medium = reportData.findings.filter(f => f.severity === 'Medium').length;
    const low = reportData.findings.filter(f => f.severity === 'Low').length;
    
    doc.moveDown(1);
    doc.font('Helvetica-Bold').text('Risk Summary:', { continued: true })
      .font('Helvetica').text(` ${critical} Critical, ${high} High, ${medium} Medium, ${low} Low`, { width: doc.page.width - 100 });
  } */
  
  doc.moveDown(2);
  
  // TLS Configuration Section
  if (reportData.tls) {
    addSectionHeader('TLS Configuration', '#1e40af');
    
    if (reportData.tls.tls_versions) {
      addSubsection('TLS Protocol Versions:');
      Object.entries(reportData.tls.tls_versions).forEach(([version, status]) => {
        const isSecure = status === 'enabled' && (version === 'TLSv1_2' || version === 'TLSv1_3' || version === 'TLSv12' || version === 'TLSv13');
        const isDeprecated = status === 'enabled' && (version === 'TLSv1' || version === 'TLSv1_1' || version === 'TLSv10' || version === 'TLSv11');
        const statusText = status === 'enabled' ? 'Enabled' : 'Disabled';
        const versionLabel = version.replace('TLSv', 'TLS ').replace('TLS 1_', 'TLS 1.');
        
        let color = '#666';
        if (status === 'enabled') {
          color = isSecure ? '#16a34a' : isDeprecated ? '#dc2626' : '#f59e42';
        }
        
        doc.fontSize(11).fillColor('#555').font('Helvetica')
          .text(`${versionLabel}:`, { continued: true })
          .fillColor(color).font('Helvetica-Bold')
          .text(` ${statusText}`, { width: doc.page.width - 100 });
      });
      doc.moveDown(1);
    }
  }
  
  // HTTP Security Headers Section
  if (reportData.site?.headers_classified) {
    addSectionHeader('HTTP Security Headers', '#2563eb');
    
    // Header Summary
    const headers = Object.entries(reportData.site.headers_classified);
    const presentSecure = headers.filter(([_, data]) => data.status === 'present_secure').length;
    const presentWeak = headers.filter(([_, data]) => data.status === 'present_weak').length;
    const deprecated = headers.filter(([_, data]) => data.status === 'deprecated').length;
    const missing = headers.filter(([_, data]) => data.status === 'not_detected').length;
    
    doc.fontSize(11).fillColor('#555').font('Helvetica')
      .text(`Secure Headers: ${presentSecure}`, { continued: true })
      .text(` | Weak Headers: ${presentWeak}`, { continued: true })
      .text(` | Deprecated: ${deprecated}`, { continued: true })
      .text(` | Missing: ${missing}`, { width: doc.page.width - 100 });
    
    doc.moveDown(1);
    
    // Detailed Header Analysis
    addSubsection('Detailed Header Analysis:');
    
    headers.forEach(([headerName, headerData]) => {
      if (headerName === 'x_xss_protection') return; // Skip X-XSS-Protection
      
      const displayName = headerName.replace(/([A-Z])/g, '-$1').replace(/^-/, '');
      let statusColor;
      let statusText;
      
      switch(headerData.status) {
        case 'present_secure':
          statusColor = '#16a34a';
          statusText = '✓ Secure';
          break;
        case 'present_weak':
          statusColor = '#f59e42';
          statusText = '⚠ Weak';
          break;
        case 'deprecated':
          statusColor = '#dc2626';
          statusText = '✗ Deprecated';
          break;
        default:
          statusColor = '#666';
          statusText = '✗ Missing';
      }
      
      doc.fontSize(12).fillColor('#1e40af').font('Helvetica-Bold')
        .text(`${displayName}`, { continued: true })
        .fillColor(statusColor)
        .text(` ${statusText}`, { width: doc.page.width - 100 });
      
      if (headerData.detected_value) {
        doc.fontSize(10).fillColor('#555').font('Helvetica')
          .text(`Value: ${headerData.detected_value}`, { indent: 20, width: doc.page.width - 120 });
      }
      
      if (headerData.explanation) {
        doc.fontSize(10).fillColor('#555').font('Helvetica')
          .text(`Explanation: ${headerData.explanation}`, { indent: 20, width: doc.page.width - 120 });
      }
      
      if (headerData.recommendation) {
        doc.fontSize(10).fillColor('#16a34a').font('Helvetica')
          .text(`Recommendation: ${headerData.recommendation}`, { indent: 20, width: doc.page.width - 120 });
      }
      
      doc.moveDown(0.5);
    });
    
    doc.moveDown(1);
  }
  
  // Server Software Detection
  if (reportData.site?.software || reportData.site?.software_version) {
    addSectionHeader('Server Software Detection', '#059669');
    
    if (reportData.site.software) {
      doc.fontSize(11).fillColor('#555').font('Helvetica-Bold')
        .text('Detected Software:', { continued: true })
        .font('Helvetica').text(` ${reportData.site.software}`, { width: doc.page.width - 100 });
    }
    
    if (reportData.site.software_version) {
      doc.fontSize(11).fillColor('#555').font('Helvetica-Bold')
        .text('Software Version:', { continued: true })
        .font('Helvetica').text(` ${reportData.site.software_version}`, { width: doc.page.width - 100 });
    } else {
      doc.fontSize(11).fillColor('#f59e42').font('Helvetica')
        .text('Version: Not exposed (CVE matching requires version information)', { width: doc.page.width - 100 });
    }
    
    doc.moveDown(2);
  }
  
  // CVE Findings Section
  if (reportData.cves) {
    addSectionHeader('Security Vulnerabilities (CVE)', '#dc2626');
    
    if (reportData.cves.status === 'skipped') {
      doc.fontSize(11).fillColor('#f59e42').font('Helvetica')
        .text('CVE Scan Skipped: Version information not available for accurate vulnerability matching.', { width: doc.page.width - 100 });
      doc.moveDown(1);
    } else if (reportData.cves.items && reportData.cves.items.length > 0) {
      doc.fontSize(11).fillColor('#555').font('Helvetica')
        .text(`Found ${reportData.cves.items.length} CVEs affecting the detected software.`, { width: doc.page.width - 100 });
      doc.moveDown(1);
      
      reportData.cves.items.forEach((cve, index) => {
        // CVE Header with severity indicator
        doc.fontSize(12).fillColor('#dc2626').font('Helvetica-Bold')
          .text(`${cve.id || cve.CVE}`, { continued: true });
        
        if (cve.severity) {
          doc.fontSize(10).fillColor('#666').font('Helvetica')
            .text(` | Severity: ${cve.severity}`, { width: doc.page.width - 100 });
        } else {
          doc.text('', { width: doc.page.width - 100 });
        }
        
        // Description
        if (cve.summary || cve.description) {
          doc.fontSize(10).fillColor('#555').font('Helvetica')
            .text('Description:', { indent: 20, continued: true })
            .fillColor('#666')
            .text(` ${cve.summary || cve.description}`, { 
              width: doc.page.width - 140,
              indent: 20,
              align: 'justify'
            });
        }
        
        // CVSS Score if available
        if (cve.cvss_score) {
          doc.fontSize(10).fillColor('#555').font('Helvetica')
            .text(`CVSS Score: ${cve.cvss_score}`, { indent: 20, width: doc.page.width - 120 });
        }
        
        doc.moveDown(0.5);
        
        // Add separator between CVEs (except for the last one)
        if (index < reportData.cves.items.length - 1) {
          doc.moveTo(50, doc.y)
             .lineTo(doc.page.width - 50, doc.y)
             .stroke('#eee');
          doc.moveDown(0.5);
        }
      });
    } else {
      doc.fontSize(11).fillColor('#16a34a').font('Helvetica')
        .text('No CVEs found for the detected software version.', { width: doc.page.width - 100 });
    }
    
    doc.moveDown(2);
  }
  
  
  
  // Reputation Check Section
  if (reportData.site?.reputation) {
    addSectionHeader('Domain Reputation Check', '#ea580c');
    
    const hasThreats = reportData.site.reputation.matches && reportData.site.reputation.matches.length > 0;
    
    if (hasThreats) {
      doc.fontSize(11).fillColor('#dc2626').font('Helvetica-Bold')
        .text('⚠️ MALICIOUS ACTIVITY DETECTED!', { width: doc.page.width - 100 });
      doc.moveDown(0.5);
      
      doc.fontSize(10).fillColor('#555').font('Helvetica')
        .text('This domain has been flagged in Google Safe Browsing for the following threats:', { width: doc.page.width - 100 });
      
      reportData.site.reputation.matches.forEach((match, index) => {
        doc.fontSize(10).fillColor('#dc2626').font('Helvetica')
          .text(`• ${match.threatType}`, { indent: 20, width: doc.page.width - 120 });
      });
    } else {
      doc.fontSize(11).fillColor('#16a34a').font('Helvetica')
        .text('✓ No known threats detected in Google Safe Browsing.', { width: doc.page.width - 100 });
    }
    
    doc.fontSize(9).fillColor('#666').font('Helvetica-Oblique')
      .text('Note: This check uses Google Safe Browsing API to detect malware, phishing, and social engineering threats.', { width: doc.page.width - 100 });
    
    doc.moveDown(2);
  }
  
  // Threat Intelligence (OTX) Section
  if (reportData.findings) {
    const threatIntelFindings = reportData.findings.filter(f => f.category === 'threat-intel' && f.evidence?.pulses?.length > 0);
    
    if (threatIntelFindings.length > 0) {
      addSectionHeader('Threat Intelligence (AlienVault OTX)', '#be185d');
      
      threatIntelFindings.forEach(finding => {
        doc.fontSize(11).fillColor('#dc2626').font('Helvetica-Bold')
          .text(`⚠️ Domain flagged in ${finding.evidence.pulses.length} security reports`, { width: doc.page.width - 100 });
        
        doc.fontSize(10).fillColor('#555').font('Helvetica')
          .text('This website\'s domain has been linked to malware, ransomware, and botnet attacks in multiple security databases.', { width: doc.page.width - 100 });
        
        doc.moveDown(0.5);
        
        if (finding.evidence.pulses.length > 0) {
          addSubsection('Recent Threat Reports:');
          
          finding.evidence.pulses.slice(0, 5).forEach((pulse, index) => {
            doc.fontSize(10).fillColor('#0a192f').font('Helvetica-Bold')
              .text(`${index + 1}. ${pulse.name}`, { indent: 20, width: doc.page.width - 120 });
            
            if (pulse.author) {
              doc.fontSize(9).fillColor('#555').font('Helvetica')
                .text(`Author: ${pulse.author}`, { indent: 30, width: doc.page.width - 130 });
            }
            
            if (pulse.modified) {
              const date = new Date(pulse.modified).toLocaleDateString();
              doc.fontSize(9).fillColor('#555').font('Helvetica')
                .text(`Date: ${date}`, { indent: 30, width: doc.page.width - 130 });
            }
            
            if (pulse.tags && pulse.tags.length > 0) {
              doc.fontSize(9).fillColor('#555').font('Helvetica')
                .text(`Tags: ${pulse.tags.join(', ')}`, { indent: 30, width: doc.page.width - 130 });
            }
            
            doc.moveDown(0.3);
          });
        }
        
        doc.moveDown(1);
      });
    }
  }
  
      // Website Security Section
    if (reportData.site) {
      // Additional Site Information
      addSectionHeader('Server Information', '#374151');
      
      // Raw headers if available
      if (reportData.site.raw_headers) {
        addSubsection('Server Header Information:');
        if (reportData.site.raw_headers.server) {
          doc.fontSize(11).fillColor('#555').font('Helvetica')
            .text(`Server: ${reportData.site.raw_headers.server}`, { indent: 20, width: doc.page.width - 120 });
        }
        if (reportData.site.raw_headers.powered_by) {
          doc.fontSize(11).fillColor('#555').font('Helvetica')
            .text(`Powered By: ${reportData.site.raw_headers.powered_by}`, { indent: 20, width: doc.page.width - 120 });
        }
        doc.moveDown(1);
      }
      
      
    } else {
      addSectionHeader('Site Information', '#374151');
      doc.fontSize(11).fillColor('#666').font('Helvetica')
        .text('No additional site information available.', { width: doc.page.width - 100 });
      doc.moveDown(1);
    }

    

    

    // Findings Summary
    if (reportData.findings && Array.isArray(reportData.findings)) {
      doc.fontSize(18).fillColor('#0a192f').text('Aggregated Findings', { width: doc.page.width - 100 });
      doc.moveDown(0.5);
      reportData.findings.forEach(f => {
        let severityColor;
        let severityText = f.severity || 'Info';
        
        // Set color based on severity level
        switch(severityText.toLowerCase()) {
          case 'critical':
            severityColor = '#991b1b';
            break;
          case 'high':
            severityColor = '#dc2626';
            break;
          case 'medium':
            severityColor = '#f59e42';
            break;
          case 'low':
            severityColor = '#16a34a';
            break;
          default:
            severityColor = '#666';
        }
        
        doc.fontSize(12)
          .fillColor(severityColor).font('Helvetica-Bold')
          .text(`[${severityText}]`, { continued: true })
          .fillColor('#555').font('Helvetica')
          .text(` ${f.category}:`, { continued: true })
          .fillColor('#666')
          .text(` ${f.title}`, { 
            width: doc.page.width - 100,
            align: 'justify'
          });
        doc.moveDown(0.3);
      });
      doc.moveDown(1);
    }

  // Security Recommendations Section
  addSectionHeader('Security Recommendations', '#1f2937');
  
  // TLS Recommendations
  if (reportData.tls) {
    addSubsection('TLS Configuration Recommendations:');
    const tlsVersions = reportData.tls.tls_versions || {};
    const hasDeprecatedTLS = Object.entries(tlsVersions).some(([version, status]) => 
      status === 'enabled' && (version === 'TLSv1' || version === 'TLSv1_1')
    );
    
    if (hasDeprecatedTLS) {
      addBulletPoint('Disable deprecated TLS versions (TLS 1.0 and TLS 1.1) to improve security');
    }
    
    const hasSecureTLS = Object.entries(tlsVersions).some(([version, status]) => 
      status === 'enabled' && (version === 'TLSv1_2' || version === 'TLSv1_3')
    );
    
    if (hasSecureTLS) {
      addBulletPoint('Maintain support for TLS 1.2 and TLS 1.3 for optimal security');
    } else {
      addBulletPoint('Enable TLS 1.2 or higher for secure communications');
    }
    doc.moveDown(0.5);
  }
  
  // HTTP Headers Recommendations
  if (reportData.headers && Array.isArray(reportData.headers)) {
    addSubsection('HTTP Security Headers Recommendations:');
    const securityHeaders = [
      'strict-transport-security',
      'content-security-policy', 
      'x-frame-options',
      'x-content-type-options',
      'referrer-policy'
    ];
    
    const missingHeaders = securityHeaders.filter(header => 
      !reportData.headers.some(h => h.name && h.name.toLowerCase() === header)
    );
    
    if (missingHeaders.length > 0) {
      missingHeaders.forEach(header => {
        addBulletPoint(`Implement ${header.replace(/-/g, ' ').toUpperCase()} header for enhanced security`);
      });
    } else {
      addBulletPoint('All recommended security headers are properly configured');
    }
    doc.moveDown(0.5);
  }
  
  // CVE Recommendations
  if (reportData.cves && Array.isArray(reportData.cves.items) && reportData.cves.items.length > 0) {
    addSubsection('CVE Remediation Recommendations:');
    const criticalCVEs = reportData.cves.items.filter(cve => 
      cve.severity && cve.severity.toLowerCase() === 'critical'
    ).length;
    
    if (criticalCVEs > 0) {
      addBulletPoint(`Address ${criticalCVEs} critical CVE(s) immediately - these pose severe security risks`);
    }
    
    const highCVEs = reportData.cves.items.filter(cve => 
      cve.severity && cve.severity.toLowerCase() === 'high'
    ).length;
    
    if (highCVEs > 0) {
      addBulletPoint(`Prioritize patching ${highCVEs} high-severity CVE(s) in the next maintenance window`);
    }
    
    addBulletPoint('Establish a regular vulnerability scanning schedule');
    addBulletPoint('Keep all software components updated to their latest secure versions');
    doc.moveDown(0.5);
  }
  
  // Network Security Recommendations
  if (reportData.network && reportData.network.ports) {
    addSubsection('Network Security Recommendations:');
    const openPorts = (reportData.network.ports || []).filter(p => p.status === 'open');
    
    if (openPorts.length > 5) {
      addBulletPoint('Review and minimize the number of open ports - consider closing unnecessary services');
    }
    
    const riskyPorts = openPorts.filter(p => 
      [21, 23, 25, 53, 110, 143, 993, 995].includes(p.port)
    );
    
    if (riskyPorts.length > 0) {
      addBulletPoint('Consider securing or replacing services on traditional ports (FTP, Telnet, SMTP, DNS)');
    }
    
    addBulletPoint('Implement network segmentation and proper firewall rules');
    addBulletPoint('Regularly audit network services and access controls');
    doc.moveDown(0.5);
  }
  
  // General Security Best Practices
  addSubsection('General Security Best Practices:');
  addBulletPoint('Implement regular security audits and penetration testing');
  addBulletPoint('Keep all software and dependencies up to date');
  addBulletPoint('Use strong, unique passwords and implement multi-factor authentication');
  
  doc.moveDown(1);

  // Footer with compact spacing
  doc.moveDown(1);
  doc.moveTo(50, doc.y)
     .lineTo(doc.page.width - 50, doc.y)
     .stroke('#ddd');
     
  doc.fontSize(10)
     .fillColor('#666')
     .font('Helvetica-Bold')
     .text('Generated by Cyber Suite', { align: 'center', width: doc.page.width - 100 })
     .font('Helvetica')
     .text('https://owasp.org/www-community/Port_Scanning', { align: 'center', width: doc.page.width - 100, link: 'https://owasp.org/www-community/Port_Scanning' });
  doc.end(); // Finish the PDF stream

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

module.exports = router;
