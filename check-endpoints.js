/**
 * Endpoint verification script
 * Run this to check that all required API endpoints are properly registered
 */

const http = require('http');

// Endpoints to check
const endpointsToCheck = [
  { method: 'GET', path: '/api/health' },
  { method: 'GET', path: '/api/jobs' },
  { method: 'POST', path: '/api/jobs' },
  { method: 'GET', path: '/api/jobs/check' },
  { method: 'GET', path: '/api/debug/routes' }
];

// Server URLs to check (in priority order)
const servers = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5173'
];

// Function to check one endpoint
async function checkEndpoint(server, endpoint) {
  return new Promise((resolve) => {
    const url = `${server}${endpoint.path}`;
    const req = http.request(url, {
      method: endpoint.method === 'POST' ? 'OPTIONS' : 'GET', // Use OPTIONS for POST endpoints to avoid mutation
      headers: {
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          url,
          method: endpoint.method,
          status: res.statusCode,
          headers: res.headers,
          available: res.statusCode !== 404, // Consider endpoint available if not 404
          responseData: res.statusCode === 200 ? data : null
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        url,
        method: endpoint.method,
        available: false,
        error: error.message
      });
    });
    
    req.end();
  });
}

// Main function to check all endpoints against all servers
async function checkAllEndpoints() {
  console.log('Checking API endpoints availability...\n');
  
  for (const server of servers) {
    console.log(`Checking server: ${server}`);
    
    // Check if server is up at all
    try {
      const serverCheck = await checkEndpoint(server, { method: 'GET', path: '/' });
      if (serverCheck.error) {
        console.log(`  Server ${server} is not responding: ${serverCheck.error}`);
        continue;
      }
    } catch (e) {
      console.log(`  Server ${server} is not accessible`);
      continue;
    }
    
    console.log(`  Server ${server} is up, checking endpoints...`);
    
    // Check all endpoints
    for (const endpoint of endpointsToCheck) {
      const result = await checkEndpoint(server, endpoint);
      
      if (result.available) {
        console.log(`  ✅ ${endpoint.method} ${endpoint.path} - Available (${result.status})`);
      } else {
        console.log(`  ❌ ${endpoint.method} ${endpoint.path} - Not available (${result.status || result.error})`);
      }
    }
    
    console.log(''); // Empty line between servers
  }
  
  console.log('Endpoint check completed!');
}

// Run the check
checkAllEndpoints();
