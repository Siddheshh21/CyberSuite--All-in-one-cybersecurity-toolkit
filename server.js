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
// More flexible CORS configuration to handle all Vercel deployment URLs
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:5174',
      'http://localhost:5173',
      'https://cyber-suite-all-in-one-cybersecurit.vercel.app'
    ];
    
    // Check if the origin is in the allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // Allow all Vercel deployment URLs
    if (origin.match(/https:\/\/.*\.vercel\.app$/) ||
        origin.includes('cyber-suite') ||
        origin.includes('cybersuite')) {
      return callback(null, true);
    }
    
    // Allow the frontend URL from environment variable
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    
    // Log rejected origins for debugging
    console.log('Rejected Origin:', origin);
    callback(null, false);
  },
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
app.get('/', (req, res) => {
  // Log the origin of the request for debugging
  console.log('Request origin:', req.headers.origin);
  res.send('Cyber Suite backend running');
});

// --- Start server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
