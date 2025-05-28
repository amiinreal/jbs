// Test script to check Vite proxy configuration

const fetch = require('node-fetch');

async function testProxyConfiguration() {
  console.log('Testing API proxy configuration...');
  
  try {
    // Test direct backend connection first
    console.log('\n1. Testing direct backend connection...');
    const directResponse = await fetch('http://localhost:5000/api/health');
    
    if (!directResponse.ok) {
      console.error(`Direct backend connection failed: ${directResponse.status}`);
    } else {
      const directData = await directResponse.json();
      console.log('Direct backend connection successful:', directData);
    }
    
    // Test Vite proxy connection
    console.log('\n2. Testing Vite proxy connection...');
    const proxyResponse = await fetch('http://localhost:5173/api/health');
    
    if (!proxyResponse.ok) {
      console.error(`Vite proxy connection failed: ${proxyResponse.status}`);
      console.log('Make sure Vite is running and proxy is configured correctly in vite.config.js');
    } else {
      const proxyData = await proxyResponse.json();
      console.log('Vite proxy connection successful:', proxyData);
    }
    
    console.log('\nSummary:');
    console.log('- Direct backend connection: ' + (directResponse.ok ? 'OK' : 'FAILED'));
    console.log('- Vite proxy connection: ' + (proxyResponse.ok ? 'OK' : 'FAILED'));
    
  } catch (err) {
    console.error('Test failed:', err);
    console.log('\nTroubleshooting tips:');
    console.log('1. Make sure backend server is running on port 5000');
    console.log('2. Make sure Vite dev server is running on port 5173');
    console.log('3. Check vite.config.js has proper proxy configuration');
    console.log('4. Check CORS settings in backend/server.js');
  }
}

testProxyConfiguration();
