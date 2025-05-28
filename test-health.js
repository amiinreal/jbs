// Test script for API health check using built-in fetch

async function checkApiHealth() {
  try {
    console.log('Testing API health endpoint at http://localhost:3001/api/health');
    const response = await fetch('http://localhost:3001/api/health');
    
    if (!response.ok) {
      console.error(`Health check failed with status: ${response.status}`);
      return;
    }
    
    const data = await response.json();
    console.log('Health check successful:', data);
  } catch (error) {
    console.error('Error during health check:', error);
  }
}

checkApiHealth();