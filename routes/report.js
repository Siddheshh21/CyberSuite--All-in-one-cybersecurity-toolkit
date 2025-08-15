const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');

router.post('/generate', (req, res) => {
  try {
    const reportData = req.body;
    if (!reportData) {
      return res.status(400).json({ ok: false, error: 'Report data required' });
    }

  const doc = new PDFDocument({ margin: 40 });
  // Add a colored header bar
  doc.rect(0, 0, doc.page.width, 60).fill('#0ea5e9');
  doc.fillColor('#fff').fontSize(26).font('Helvetica-Bold').text('Cyber Suite Vulnerability Report', 0, 18, { align: 'center', width: doc.page.width - 80 });
  doc.moveDown(2);
  doc.fillColor('#222').font('Helvetica');

    // Set response headers to send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=cybersuite-report.pdf');

    // Pipe PDF data to response
    doc.pipe(res);

  // Add Report Summary
  doc.fontSize(14).fillColor('#0ea5e9').text('Report Summary', { underline: true, width: doc.page.width - 80, align: 'left' });
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor('#222').text(`URL: ${reportData.url || 'N/A'}`, { width: doc.page.width - 80 });
  doc.text(`Date: ${new Date().toLocaleString()}`, { width: doc.page.width - 80 });
  doc.moveDown(1);

    // Website Security Section
    if (reportData.site) {
      doc.fontSize(14).fillColor('#0ea5e9').text('Website Security Scan', { underline: true, width: doc.page.width - 80, align: 'left' });
      doc.moveDown(0.5);
      Object.entries(reportData.site).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          doc.fontSize(12).fillColor('#222').text(`${key}:`, { width: doc.page.width - 80 });
          Object.entries(value).forEach(([subKey, subValue]) => {
            doc.fontSize(11).fillColor('#444').text(`   ${subKey}: ${typeof subValue === 'object' ? JSON.stringify(subValue, null, 2) : subValue}`, { width: doc.page.width - 80 });
          });
        } else {
          doc.fontSize(12).fillColor('#222').text(`${key}: ${value}`, { width: doc.page.width - 80 });
        }
      });
      doc.moveDown(1);
    }

    // CVE Findings Section
    if (reportData.cves && Array.isArray(reportData.cves.items)) {
      doc.fontSize(14).fillColor('#0ea5e9').text('CVE Findings', { underline: true, width: doc.page.width - 80, align: 'left' });
      doc.moveDown(0.5);
      reportData.cves.items.forEach(cve => {
        doc.fontSize(12).fillColor('#d97706').text(`- ${cve.id || cve.CVE} | Severity: ${cve.severity || 'Unknown'}`, { width: doc.page.width - 80 });
        doc.fontSize(11).fillColor('#222').text(`  Description: ${cve.summary || cve.description || 'No description'}`, { width: doc.page.width - 80 });
        doc.moveDown(0.5);
      });
      doc.moveDown(1);
    }

    // Network Scan Section
    if (reportData.network) {
      doc.fontSize(14).fillColor('#0ea5e9').text('Network Scan', { underline: true, width: doc.page.width - 80, align: 'left' });
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
      doc.fontSize(12).fillColor('#16a34a').text(`Open ports: ${openPorts.length}`, { width: doc.page.width - 80 });
      if (openPorts.length > 0) {
        openPorts.forEach(port => {
          doc.fontSize(11).fillColor('#222').text(`- Port ${port.port}${port.service ? ` (${port.service})` : ''}`, { width: doc.page.width - 80 });
        });
      } else {
        doc.fontSize(11).fillColor('#222').text('None', { width: doc.page.width - 80 });
      }
      doc.fontSize(12).fillColor('#dc2626').text(`Closed ports: ${closedPorts.length}`, { width: doc.page.width - 80 });
      if (closedPorts.length > 0) {
        closedPorts.forEach(port => {
          doc.fontSize(11).fillColor('#222').text(`- Port ${port.port}${port.service ? ` (${port.service})` : ''}`, { width: doc.page.width - 80 });
        });
      } else {
        doc.fontSize(11).fillColor('#222').text('None', { width: doc.page.width - 80 });
      }
      doc.moveDown(1);
    }

    // Findings Summary
    if (reportData.findings && Array.isArray(reportData.findings)) {
      doc.fontSize(14).fillColor('#0ea5e9').text('Aggregated Findings', { underline: true, width: doc.page.width - 80, align: 'left' });
      doc.moveDown(0.5);
      reportData.findings.forEach(f => {
        doc.fontSize(12).fillColor(f.severity === 'high' ? '#dc2626' : f.severity === 'medium' ? '#f59e42' : '#16a34a').text(`- [${f.severity || 'Info'}] ${f.category}: ${f.title}`, { width: doc.page.width - 80 });
      });
      doc.moveDown(1);
    }

  // Footer
  doc.fontSize(10).fillColor('#888').text('Generated by Cyber Suite | https://owasp.org/www-community/Port_Scanning', 40, doc.page.height - 40, { align: 'center' });
  doc.end(); // Finish the PDF stream

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

module.exports = router;
