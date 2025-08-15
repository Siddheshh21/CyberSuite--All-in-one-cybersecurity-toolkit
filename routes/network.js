const express = require('express');
const router = express.Router();
const portscanner = require('portscanner');

// Common ports to check
const commonPorts = [21, 22, 25, 53, 80, 110, 143, 443, 465, 587, 993, 995, 8080];

router.get('/scan', async (req, res) => {
    const target = (req.query.target || '').trim();

    if (!target) {
        return res.status(400).json({ ok: false, error: 'target query param required' });
    }

    try {
        const scanPromises = commonPorts.map(async port => {
            const status = await portscanner.checkPortStatus(port, target);
            return { port, status: status === 'open' ? 'open' : 'closed' };
        });

        const results = await Promise.all(scanPromises);

        res.json({
            ok: true,
            target,
            scanned_ports: commonPorts.length,
            results
        });
    } catch (err) {
        console.error('Network scan error:', err.message);
        res.status(500).json({ ok: false, error: 'network_scan_error', details: err.message });
    }
});

module.exports = router;