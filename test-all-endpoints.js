// Test script to check if all frontend components can connect to the backend API
const fetch = require('node-fetch');

const backendUrl = 'https://cybersuite-all-in-one-cybersecurity-toolkit-production.up.railway.app';
const testEmail = 'test@example.com';
const testUrl = 'https://example.com';
const testPassword = 'test123';

async function testPasswordAPI() {
  console.log('\n1. Testing Password API...');
  
  try {
    const response = await fetch(`${backendUrl}/api/password/analyze`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Origin': 'https://cyber-suite.vercel.app'
      },
      body: JSON.stringify({ password: testPassword })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Password API connection successful!');
    return true;
  } catch (error) {
    console.error('❌ Password API connection failed:', error.message);
    return false;
  }
}

async function testEmailAPI() {
  console.log('\n2. Testing Email Breach Checker API...');
  
  try {
    const response = await fetch(`${backendUrl}/api/email/check`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Origin': 'https://cyber-suite.vercel.app'
      },
      body: JSON.stringify({ email: testEmail })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Email API connection successful!');
    return true;
  } catch (error) {
    console.error('❌ Email API connection failed:', error.message);
    return false;
  }
}

async function testVulnAPI() {
  console.log('\n3. Testing Vulnerability Scan API...');
  
  try {
    const response = await fetch(`${backendUrl}/api/vuln/lite`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Origin': 'https://cyber-suite.vercel.app'
      },
      body: JSON.stringify({ url: testUrl })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Vulnerability Scan API connection successful!');
    return true;
  } catch (error) {
    console.error('❌ Vulnerability Scan API connection failed:', error.message);
    return false;
  }
}

async function testBackendHealth() {
  console.log('\n4. Testing Backend Health...');
  
  try {
    const response = await fetch(backendUrl, {
      headers: {
        'Origin': 'https://cyber-suite.vercel.app'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const text = await response.text();
    console.log('✅ Backend health check successful!');
    return true;
  } catch (error) {
    console.error('❌ Backend health check failed:', error.message);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('=== Testing All API Endpoints ===');
  
  const healthResult = await testBackendHealth();
  const passwordResult = await testPasswordAPI();
  const emailResult = await testEmailAPI();
  const vulnResult = await testVulnAPI();
  
  console.log('\n=== Test Results ===');
  console.log(`Backend Health: ${healthResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Password API: ${passwordResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Email API: ${emailResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Vulnerability API: ${vulnResult ? '✅ PASS' : '❌ FAIL'}`);
  
  if (healthResult && passwordResult && emailResult && vulnResult) {
    console.log('\n✅ All tests passed! The backend API is accessible from the frontend.');
  } else {
    console.log('\n❌ Some tests failed. The backend API may not be accessible from the frontend.');
  }
}

runTests();