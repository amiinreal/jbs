import { getApiErrorMessage } from './apiStatus';

/**
 * Service for job listing operations
 */

// Get the base API URL for consistency
const getBaseUrl = () => {
  // Always use the backend URL from env vars or fallback to localhost:3000
  return import.meta.env.VITE_API_URL || 'http://localhost:3000';
};

/**
 * Create a new job listing
 * @param {Object} jobData - The job listing data to create
 * @returns {Promise<Object>} - The created job listing
 */
const createJobListing = async (jobData) => {
  try {
    // Get the base API URL
    const backendUrl = getBaseUrl();
    console.log('Using backend URL:', backendUrl);
    
    console.log('Creating job with data:', jobData);
    
    // Try multiple endpoints with different approaches
    const endpoints = [
      // Try proxy endpoint first (most reliable in development)
      { url: '/api/jobs', useProxy: true },
      // Then try direct backend URL
      { url: `${backendUrl}/api/jobs`, useProxy: false },
      // Alternative endpoint names as fallbacks
      { url: `${backendUrl}/api/job-listings`, useProxy: false },
      { url: `/api/job-listings`, useProxy: true }
    ];
    
    let lastError = null;
    
    // Try each endpoint until one succeeds
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying ${endpoint.useProxy ? 'proxy' : 'direct'} endpoint: ${endpoint.url}`);
        
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(jobData)
        });
        
        console.log(`Endpoint ${endpoint.url} response status:`, response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Job creation successful:', data);
          return data.data || data;
        }
        
        // Store the last error for reporting if all endpoints fail
        lastError = new Error(`Server returned ${response.status}`);
        
        // For 404 errors, continue to next endpoint
        if (response.status === 404) {
          console.log(`Endpoint ${endpoint.url} not found, trying next endpoint`);
          continue;
        }
        
        // For other errors, try to parse the error response
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || `Server returned ${response.status}`);
        } catch (parseError) {
          throw new Error(`Server returned ${response.status}`);
        }
      } catch (endpointError) {
        // Only store network errors, not response errors
        if (endpointError.message.includes('Failed to fetch')) {
          lastError = endpointError;
          console.error(`Network error with endpoint ${endpoint.url}:`, endpointError);
        } else {
          throw endpointError;
        }
      }
    }
    
    // If we've tried all endpoints and none worked
    throw lastError || new Error('All job creation endpoints failed');
  } catch (error) {
    console.error('Error creating job listing:', error);
    throw new Error(`The job creation service is currently unavailable. Please try again later. (${error.message})`);
  }
};

/**
 * Get all job listings
 * @returns {Promise<Array>} - List of job listings
 */
const getJobListings = async () => {
  try {
    const backendUrl = getBaseUrl();
    
    // Try to fetch from the backend directly
    const response = await fetch(`${backendUrl}/api/jobs`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      // If that fails, try the Vite proxy
      console.warn('Direct endpoint failed, trying proxy', response.status);
      const proxyResponse = await fetch('/api/jobs', {
        credentials: 'include'
      });
      
      if (!proxyResponse.ok) {
        throw new Error(`Error fetching job listings: ${proxyResponse.status}`);
      }
      
      const data = await proxyResponse.json();
      return data.data || [];
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching job listings:', error);
    throw new Error(getApiErrorMessage(error));
  }
};

export { createJobListing, getJobListings };
