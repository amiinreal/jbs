/**
 * API Health Check Utility
 * Provides functions to check API connectivity status
 */

// Check API server health - will try both API paths to handle proxy issues
export async function checkApiHealth() {
  try {
    // Try connecting through the Vite dev server proxy first (most reliable in development)
    console.log('Attempting API health check through proxy at /api/health');
    
    const proxyResponse = await fetch('/api/health', {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      credentials: 'include'
    });
    
    if (proxyResponse.ok) {
      const data = await proxyResponse.json();
      console.log('Proxy API health check successful:', data);
      return { ok: true, data };
    }
    
    // If proxy fails, try direct connection to the backend server
    // Get the correct backend URL from environment, default to localhost:3000
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    console.log('Proxy failed. Attempting direct API health check at:', `${backendUrl}/api/health`);
    
    const response = await fetch(`${backendUrl}/api/health`, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      // Don't include credentials for this direct request to avoid preflight CORS issues
      mode: 'cors'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Direct API health check successful:', data);
      return { ok: true, data };
    }
    
    console.error('Both direct and proxy API health checks failed');
    return { 
      ok: false, 
      error: 'API server unavailable', 
      status: proxyResponse.status || response.status 
    };
  } catch (error) {
    console.error('API health check failed with error:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Check if API is ready to handle jobs-related requests
 */
export async function checkJobsApiReady() {
  try {
    const response = await fetch('/api/jobs/check', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      credentials: 'include'
    });
    
    // Status 401/403 means endpoint exists but requires auth
    if (response.status === 401 || response.status === 403) {
      return { ok: true, requiresAuth: true };
    }
    
    if (response.ok) {
      const data = await response.json();
      return { ok: true, data };
    }
    
    return { ok: false, status: response.status };
  } catch (error) {
    console.error('Jobs API check failed:', error);
    return { ok: false, error: error.message };
  }
}
