/**
 * API configuration for frontend requests
 */

// Base URL for API requests
const API_BASE_URL = 'http://localhost:3000/api';

// Helper for making authenticated requests
const fetchWithAuth = async (endpoint, options = {}) => {
  try {
    const API_BASE_URL = window.location.origin;
    
    // Ensure URL starts with slash
    const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    const url = `${API_BASE_URL}/api${formattedEndpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {})
      },
      credentials: 'include'
    });
    
    // Special handling for auth/check endpoint - don't treat 401/403 as errors
    if (!response.ok && endpoint !== '/auth/check' && endpoint !== 'auth/check') {
      // Try to get error details from response
      let errorMessage;
      try {
        // Check content type to see if it's JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || `Request failed with status ${response.status}`;
        } else {
          // Handle non-JSON responses (like HTML error pages)
          const textResponse = await response.text();
          if (textResponse.length > 100) {
            // If response is too long, it's likely an HTML error page
            errorMessage = `Request failed with status ${response.status} (Non-JSON response)`;
          } else {
            errorMessage = textResponse || `Request failed with status ${response.status}`;
          }
        }
      } catch (parseError) {
        // If we can't parse the error response at all
        errorMessage = `Request failed with status ${response.status}`;
      }
      
      throw new Error(errorMessage);
    }
    
    // For auth/check endpoint, always try to parse the response regardless of status code
    if (endpoint === '/auth/check' || endpoint === 'auth/check') {
      try {
        return await response.json();
      } catch (e) {
        // If parsing fails, return a default unauthenticated response
        return { isAuthenticated: false };
      }
    }
    
    // Continue with normal flow for other endpoints
    // Check if there's actually content to parse
    const contentLength = response.headers.get('content-length');
    if (contentLength === '0') {
      // Empty response
      return { success: true };
    }
    
    // Check if the response is JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error(`API endpoint ${url} returned HTML instead of JSON. Server may be misconfigured.`);
      throw new Error('API endpoint invalid or not found');
    }
    
    // Now try to parse JSON
    try {
      const data = await response.json();
      return data;
    } catch (jsonError) {
      console.error('Error parsing JSON response:', jsonError);
      throw new Error('Invalid response format from server');
    }
  } catch (error) {
    // Try to provide more helpful error messages
    if (error.message === 'Failed to fetch') {
      throw new Error('API server cannot be reached. Check your network connection or server status.');
    }
    throw error;
  }
};

// API methods for frontend use
const api = {
  // Auth endpoints
  auth: {
    login: async (credentials) => {
      // Ensure username and password are properly formatted
      const { username, password } = credentials;
      
      if (!username || !password) {
        throw new Error('Username and password are required');
      }
      
      return fetchWithAuth('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
    },
    
    register: (userData) => fetchWithAuth('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),
    
    logout: () => fetchWithAuth('/auth/logout', {
      method: 'POST'
    }),
    
    checkAuth: () => fetchWithAuth('/auth/check')
  },
  
  // Listings endpoints
  listings: {
    getHouses: () => fetchWithAuth('/houses/public'),
    getJobs: () => fetchWithAuth('/jobs/public'),
    getCars: () => fetchWithAuth('/cars/public'),
    getItems: () => fetchWithAuth('/items/public'),
    getUserListings: () => fetchWithAuth('/user/listings')
  },
  
  // Jobs endpoints
  jobs: {
    getAll: () => fetchWithAuth('/jobs/public'),
    getById: (id) => fetchWithAuth(`/jobs/${id}`),
    create: (jobData) => fetchWithAuth('/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData)
    }),
    update: (id, jobData) => fetchWithAuth(`/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(jobData)
    }),
    delete: (id) => fetchWithAuth(`/jobs/${id}`, {
      method: 'DELETE'
    })
  },
  
  // File handling
  files: {
    getFileUrl: (fileId) => `${API_BASE_URL}/files/${fileId}`,
    uploadFile: (formData, entityType) => {
      return fetch(`${API_BASE_URL}/files/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      }).then(response => response.json());
    }
  }
};

export default api;
