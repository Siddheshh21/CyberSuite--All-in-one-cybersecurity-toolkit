const fetch = require('node-fetch');

// The backend API URL
const API_BASE_URL = 'https://cybersuite-all-in-one-cybersecurity-toolkit-production.up.railway.app';

// The specific frontend URL provided by the user
const FRONTEND_URL = 'https://cyber-suite-all-in-one-cybersecurit.vercel.app';

async function testBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/`, {
      headers: {
        'Origin': FRONTEND_URL
      }
    });
    
    const text = await response.text();
    console.log('Backend Health Check:', response.status, text);
    return response.ok;
  } catch (error) {
    console.error('Backend Health Check Failed:', error.message);
    return false;
  }
}

async function testPasswordAPI() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/password/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL
      },
      body: JSON.stringify({ password: 'TestPassword123!' })
    });
    
    const data = await response.json();
    console.log('Password API Test:', response.status);
    console.log('Password API Response:', JSON.stringify(data, null, 2));
    return response.ok;
  } catch (error) {
    console.error('Password API Test Failed:', error.message);
    return false;
  }
}

async function testEmailAPI() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/email/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL
      },
      body: JSON.stringify({ email: 'test@example.com' })
    });
    
    const data = await response.json();
    console.log('Email API Test:', response.status);
    console.log('Email API Response:', JSON.stringify(data, null, 2));
    return response.ok;
  } catch (error) {
    console.error('Email API Test Failed:', error.message);
    return false;
  }
}

async function testVulnAPI() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/vuln/lite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL
      },
      body: JSON.stringify({ url: 'https://example.com' })
    });
    
    const data = await response.json();
    console.log('Vulnerability API Test:', response.status);
    console.log('Vulnerability API Response:', JSON.stringify(data, null, 2));
    return response.ok;
  } catch (error) {
    console.error('Vulnerability API Test Failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('Testing backend with specific frontend URL:', FRONTEND_URL);
  
  const healthCheck = await testBackendHealth();
  console.log('Health Check Result:', healthCheck ? 'PASS' : 'FAIL');
  console.log('-'.repeat(50));
  
  const passwordTest = await testPasswordAPI();
  console.log('Password API Test Result:', passwordTest ? 'PASS' : 'FAIL');
  console.log('-'.repeat(50));
  
  const emailTest = await testEmailAPI();
  console.log('Email API Test Result:', emailTest ? 'PASS' : 'FAIL');
  console.log('-'.repeat(50));
  
  const vulnTest = await testVulnAPI();
  console.log('Vulnerability API Test Result:', vulnTest ? 'PASS' : 'FAIL');
  
  console.log('\nSummary:');
  console.log('Health Check:', healthCheck ? '✅ PASS' : '❌ FAIL');
  console.log('Password API:', passwordTest ? '✅ PASS' : '❌ FAIL');
  console.log('Email API:', emailTest ? '✅ PASS' : '❌ FAIL');
  console.log('Vulnerability API:', vulnTest ? '✅ PASS' : '❌ FAIL');
}

runTests().catch(error => {
  console.error('Test failed with error:', error);
});