import { useState } from 'react';

/**
 * Custom hook to handle API calls with proper error handling
 */
export default function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiCall = async (url, options = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      // Ensure credentials are included by default
      const fetchOptions = {
        credentials: 'include',
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      };
      
      const response = await fetch(url, fetchOptions);
      
      // Check for non-JSON responses which could indicate server errors
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('application/json')) {
        throw new Error(`API returned non-JSON response (${contentType}). Server may be misconfigured.`);
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `API error: ${response.status}`);
      }
      
      return data;
    } catch (err) {
      console.error(`API error (${url}):`, err);
      setError(err.message || 'An unknown error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    apiCall,
    loading,
    error,
    setError
  };
}
