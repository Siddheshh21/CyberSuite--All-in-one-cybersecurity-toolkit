// Load environment variables from .env
require('dotenv').config();

// --- Log active API integrations you use ---
console.log("OTX API Key:", process.env.OTX_API_KEY || "Not Set");
console.log("Google Safe Browsing API Key:", process.env.GOOGLE_SAFE_BROWSING_API_KEY || "Not Set");

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();

// --- Middleware ---
app.use(cors({
  origin: [
    'http://localhost:5174',
    'http://localhost:5173',
    process.env.FRONTEND_URL || '*',
    'https://cyber-suite.vercel.app'
  ],
  credentials: true
}));
app.use(bodyParser.json()); // Parse JSON request bodies

// --- Mount routes ---
app.use('/api/password', require('./routes/password'));
app.use('/api/website', require('./routes/website'));
app.use('/api/cve', require('./routes/cve'));
app.use('/api/network', require('./routes/network')); // Network scan route
app.use('/api/vuln', require('./routes/vuln'));
app.use('/api/report', require('./routes/report'));

// ✅ Updated: Email checker route now uses XposedOrNot backend
app.use('/api/email', require('./routes/email'));

// --- Test route ---
app.get('/api/password/test', (req, res) => {
    res.json({ message: 'Test route works' });
});

// --- Basic health check ---
app.get('/', (req, res) => res.send('Cyber Suite backend running'));

// --- Start server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
