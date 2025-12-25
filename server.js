// Load environment variables from .env
require('dotenv').config();

// --- Log active API integrations you use ---
// API Key status logging (without exposing actual keys)
const otxKeyStatus = process.env.OTX_API_KEY ? 'Configured' : 'Not Set';
const googleKeyStatus = process.env.GOOGLE_SAFE_BROWSING_API_KEY ? 'Configured' : 'Not Set';
console.log("OTX API Key Status:", otxKeyStatus);
console.log("Google Safe Browsing API Key Status:", googleKeyStatus);

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();

// --- Middleware ---
// CORS configuration to handle all frontend requests
app.use(cors({
  origin: [
    'https://cyber-suite-all-in-one-cybersecurit.vercel.app',
    'https://cybersuite-all-in-one-cybersecurity-toolkit-production.up.railway.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,  // Set to true to allow credentials
  maxAge: 86400  // Cache preflight request for 24 hours
}));

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Request Headers:', req.headers);
  next();
});

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
app.get('/', (req, res) => {
  // Log the origin of the request for debugging
  console.log('Request origin:', req.headers.origin);
  console.log('Request headers:', req.headers);
  res.send('Cyber Suite backend running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// --- Start server ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log('CORS configuration: Allowing all origins for debugging');
});
