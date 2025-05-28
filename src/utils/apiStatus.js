/**
 * Utility functions for API status checking
 */

/**
 * Check if the API server is up and running
 * @returns {Promise<boolean>} True if API is available, false otherwise
 */
export const checkApiHealth = async () => {
  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      // Short timeout to avoid hanging UI
      signal: AbortSignal.timeout(5000)
    });
    
    return response.ok;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
};

/**
 * Check if a specific API endpoint exists
 * @param {string} endpoint - The API endpoint to check
 * @returns {Promise<boolean>} True if endpoint exists, false otherwise
 */
export const checkApiEndpoint = async (endpoint) => {
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      // Short timeout to avoid hanging UI
      signal: AbortSignal.timeout(3000)
    });
    
    // 401/403 means endpoint exists but needs auth
    // 404 means endpoint doesn't exist
    return response.status !== 404;
  } catch (error) {
    console.error(`API endpoint check failed for ${endpoint}:`, error);
    return false;
  }
};

/**
 * Check if a specific API endpoint is available
 * @param {string} endpoint - The API endpoint to check
 * @returns {Promise<boolean>} True if the endpoint is available
 */
export const checkEndpointAvailability = async (endpoint) => {
  try {
    // Try direct connection first
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const fullUrl = `${backendUrl}${endpoint}`;
    
    console.log(`Checking endpoint availability: ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      mode: 'cors',
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    
    // Even a 401/403 means the endpoint exists but needs auth
    return response.status !== 404;
  } catch (error) {
    console.error(`Endpoint check failed for ${endpoint}:`, error);
    return false;
  }
};

/**
 * Handles common API errors and returns user-friendly error messages
 * @param {Error} error - The error that occurred
 * @returns {string} A user-friendly error message
 */
export const getApiErrorMessage = (error) => {
  if (error.message.includes('404')) {
    return 'The requested resource was not found. This may indicate that the API endpoint is not properly configured.';
  }
  
  if (error.message.includes('401') || error.message.includes('403')) {
    return 'You are not authorized to perform this action. Please log in again.';
  }
  
  // Handle network errors with more detail
  if (error.message.includes('Failed to fetch') || 
      error.message.includes('NetworkError') ||
      error.message.includes('Network request failed')) {
    return 'Cannot connect to the server. Please check your internet connection and try again.';
  }
  
  return error.message || 'An unexpected error occurred. Please try again later.';
};
