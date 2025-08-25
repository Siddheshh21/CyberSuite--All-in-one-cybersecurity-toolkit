// Test script to check if the backend API is accessible from the frontend
const fetch = require('node-fetch');

const backendUrl = 'https://cybersuite-all-in-one-cybersecurity-toolkit-production.up.railway.app';
const testPassword = 'test123';

async function testPasswordAPI() {
  console.log('Testing password API...');
  
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
    console.log(JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Password API connection failed:', error.message);
    return false;
  }
}

async function testBackendHealth() {
  console.log('Testing backend health...');
  
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
    console.log(text);
    return true;
  } catch (error) {
    console.error('❌ Backend health check failed:', error.message);
    return false;
  }
}

// Run tests
async function runTests() {
  const healthResult = await testBackendHealth();
  const passwordResult = await testPasswordAPI();
  
  if (healthResult && passwordResult) {
    console.log('\n✅ All tests passed! The backend API is accessible from the frontend.');
  } else {
    console.log('\n❌ Some tests failed. The backend API may not be accessible from the frontend.');
  }
}

runTests();