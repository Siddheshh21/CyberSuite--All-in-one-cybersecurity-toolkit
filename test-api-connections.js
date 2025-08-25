const axios = require('axios');

const API_BASE_URL = 'https://cybersuite-all-in-one-cybersecurity-toolkit-production.up.railway.app';
const FRONTEND_URL = 'https://cyber-suite-all-in-one-cybersecurit.vercel.app';

async function testEndpoints() {
  const endpoints = [
    '/api/password/test',
    '/api/email/test',
    '/api/vuln/test',
    '/'
  ];

  console.log('Starting API connection tests...');
  console.log(`Testing against backend: ${API_BASE_URL}`);
  console.log(`Using frontend origin: ${FRONTEND_URL}\n`);

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing endpoint: ${endpoint}`);
      const response = await axios({
        method: 'get',
        url: `${API_BASE_URL}${endpoint}`,
        headers: {
          'Origin': FRONTEND_URL,
          'Accept': 'application/json',
        }
      });

      console.log('Status:', response.status);
      console.log('Response:', response.data);
      console.log('Headers:', response.headers);
      console.log('CORS allowed:', response.headers['access-control-allow-origin']);
      console.log('-----------------------------------\n');
    } catch (error) {
      console.error(`Error testing ${endpoint}:`);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', error.response.data);
        console.error('Headers:', error.response.headers);
      } else {
        console.error('Error:', error.message);
      }
      console.log('-----------------------------------\n');
    }
  }
}

testEndpoints().catch(console.error);