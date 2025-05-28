// Simple script to test API connectivity

const fetch = require('node-fetch');

async function testApiConnection() {
  console.log('Testing API connection...');
  
  try {
    const response = await fetch('http://localhost:3000/api/health');
    
    if (!response.ok) {
      console.error(`Health check failed with status: ${response.status}`);
      return;
    }
    
    const data = await response.json();
    console.log('Health check successful:', data);
    
    // Test jobs endpoint
    console.log('\nTesting /api/jobs endpoint...');
    const jobsResponse = await fetch('http://localhost:3000/api/jobs/debug');
    
    if (!jobsResponse.ok) {
      console.error(`Jobs check failed with status: ${jobsResponse.status}`);
      return;
    }
    
    const jobsData = await jobsResponse.json();
    console.log('Jobs API check successful:', jobsData);
    
  } catch (err) {
    console.error('API connection test failed:', err.message);
  }
}

testApiConnection();
