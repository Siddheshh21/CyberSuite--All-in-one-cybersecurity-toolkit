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
  // Add a colored header bar with gradient
  doc.rect(0, 0, doc.page.width, 80).fill('#0a192f');
  doc.fillColor('#fff')
    .font('Helvetica-Bold')
    .fontSize(28)
    .text('Cyber Suite Vulnerability Report', 50, 25, { 
      align: 'center',
      width: doc.page.width - 100
    });
  doc.moveDown(2.5);
  doc.font('Helvetica');
  doc.fillColor('#333');

    // Set response headers to send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=cybersuite-report.pdf');

    // Pipe PDF data to response
    doc.pipe(res);

  // Add Report Summary
  // Section Title Style
  doc.fontSize(18).fillColor('#0a192f').text('Report Summary', { width: doc.page.width - 100 });
  doc.moveDown(0.8);
  
  // Content Style
  doc.fontSize(12).fillColor('#444')
    .font('Helvetica-Bold').text('URL:', { continued: true })
    .font('Helvetica').text(` ${reportData.url || 'N/A'}`, { width: doc.page.width - 100 });
  
  doc.font('Helvetica-Bold').text('Date:', { continued: true })
    .font('Helvetica').text(` ${new Date().toLocaleString()}`, { width: doc.page.width - 100 });
  doc.moveDown(1.5);

    // Website Security Section
    if (reportData.site) {
      // Section Headers with consistent styling
      doc.fontSize(18).fillColor('#0a192f').text('Website Security Scan', { width: doc.page.width - 100 });
      doc.moveDown(0.5);
      Object.entries(reportData.site).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          doc.fontSize(13).fillColor('#0a192f').font('Helvetica-Bold').text(`${key}:`, { width: doc.page.width - 100 });
          doc.moveDown(0.2);
          Object.entries(value).forEach(([subKey, subValue]) => {
            doc.fontSize(11).fillColor('#555').font('Helvetica')
              .text(`• ${subKey}:`, { continued: true })
              .fillColor('#666')
              .text(` ${typeof subValue === 'object' ? JSON.stringify(subValue, null, 2) : subValue}`, { width: doc.page.width - 120, indent: 20 });
          });
          doc.moveDown(0.5);
        } else {
          doc.fontSize(11).fillColor('#555').font('Helvetica-Bold')
            .text(key, { continued: true })
            .font('Helvetica').fillColor('#666')
            .text(`: ${value}`, { width: doc.page.width - 100 });
        }
      });
      doc.moveDown(1);
    } else {
      doc.fontSize(11).fillColor('#666').font('Helvetica')
        .text('None', { 
          width: doc.page.width - 120,
          indent: 20
        });
      doc.moveDown(1);
    }

    // CVE Findings Section
    doc.fontSize(18).fillColor('#0a192f').text('CVE Findings', { width: doc.page.width - 100 });
    doc.moveDown(0.5);
    if (reportData.cves && Array.isArray(reportData.cves.items) && reportData.cves.items.length > 0) {
      reportData.cves.items.forEach(cve => {
        // CVE Header with severity indicator
        doc.fontSize(13).fillColor('#d97706').font('Helvetica-Bold')
          .text(`${cve.id || cve.CVE}`, { continued: true })
          .fontSize(11).fillColor('#666').font('Helvetica')
          .text(` | Severity: ${cve.severity || 'Unknown'}`, { width: doc.page.width - 100 });
        
        // Description with proper indentation
        doc.moveDown(0.3);
        doc.fontSize(11).fillColor('#555').font('Helvetica')
          .text('Description:', { continued: true })
          .fillColor('#666')
          .text(` ${cve.summary || cve.description || 'No description'}`, { 
            width: doc.page.width - 120,
            indent: 20,
            align: 'justify'
          });
        doc.moveDown(0.5);
      });
      doc.moveDown(1);
    }

    // Network Scan Section
    if (reportData.network) {
      doc.fontSize(18).fillColor('#0a192f').text('Network Scan', { width: doc.page.width - 100 });
      doc.moveDown(0.5);
      // Try to get ports from network object
      let ports = [];
      if (Array.isArray(reportData.network.ports)) {
        ports = reportData.network.ports;
      } else if (Array.isArray(reportData.network.results)) {
        ports = reportData.network.results;
      }
      const openPorts = ports.filter(p => p.status === 'open');
      const closedPorts = ports.filter(p => p.status === 'closed');
      
      // Open Ports Section
      doc.fontSize(13).fillColor('#16a34a').font('Helvetica-Bold')
        .text(`Open Ports (${openPorts.length})`, { width: doc.page.width - 100 });
      doc.moveDown(0.5);
      
      if (openPorts.length > 0) {
        openPorts.forEach(port => {
          doc.fontSize(11).fillColor('#555').font('Helvetica')
            .text('•', { continued: true })
            .text(` Port ${port.port}`, { continued: true })
            .fillColor('#666')
            .text(`${port.service ? ` - ${port.service}` : ''}`, { 
              width: doc.page.width - 120,
              indent: 20
            });
        });
      } else {
        doc.fontSize(11).fillColor('#666').font('Helvetica')
          .text('None detected', { 
            width: doc.page.width - 120,
            indent: 20
          });
      }
      
      // Add significant spacing before Closed Ports section
      doc.moveDown(3);
      
      // Closed Ports header
      doc.fontSize(13).fillColor('#dc2626').font('Helvetica-Bold')
        .text(`Closed Ports (${closedPorts.length})`, { width: doc.page.width - 100 });
      doc.moveDown(1);
      
      // Add the number of closed ports as a sentence
      doc.fontSize(11).fillColor('#666').font('Helvetica')
        .text(`${closedPorts.length} ports are closed.`, { 
          width: doc.page.width - 100
        });
      
      // Add extra spacing after the closed ports section
      doc.moveDown(2);
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
