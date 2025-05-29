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
  const endpointUrl = '/api/jobs';
  try {
    console.log(`Creating job via ${endpointUrl} with data:`, jobData);
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(jobData)
    });

    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || `Server error: ${response.status}`);
    }
    return responseData.data || responseData; // Assuming backend sends { success: true, data: ... } or just data
  } catch (error) {
    console.error('Error in createJobListing:', error);
    throw error; // Re-throw for the component to handle
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
