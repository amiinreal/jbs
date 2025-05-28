/**
 * Helper to handle authentication timeouts
 */

/**
 * Sets up authentication timeout detection and handling
 * @param {Function} setAuth - Function to set authentication state
 * @param {Function} setLoading - Function to set loading state
 * @returns {Object} Timeout control functions
 */
export const setupAuthTimeout = (setAuth, setLoading) => {
  let timeoutId = null;
  
  const startTimeout = (timeoutMs = 5000) => {
    // Clear any existing timeout
    if (timeoutId) clearTimeout(timeoutId);
    
    // Set new timeout
    timeoutId = setTimeout(() => {
      console.warn(`Authentication check timed out after ${timeoutMs}ms`);
      // Reset states to prevent UI from being stuck
      setLoading(false);
      setAuth(false);
      
      // Log timeout in localStorage for debugging
      try {
        localStorage.setItem('auth_timeout_occurred', 'true');
        localStorage.setItem('auth_timeout_timestamp', new Date().toISOString());
      } catch (e) {
        // Ignore localStorage errors
      }
    }, timeoutMs);
    
    return timeoutId;
  };
  
  const clearTimeout = () => {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
      
      // Clear timeout indicators
      try {
        localStorage.removeItem('auth_timeout_occurred');
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  };
  
  return {
    startTimeout,
    clearTimeout
  };
};

/**
 * Checks auth status with a guaranteed timeout and fallback mechanisms
 * @param {number} timeoutMs - Maximum time to wait
 * @returns {Promise} Auth result or timeout error
 */
export const checkAuthWithTimeout = async (timeoutMs = 5000) => {
  // First try a quick status check
  try {
    const statusResponse = await fetch('/api/auth/status', {
      credentials: 'include',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(2000)
    });
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      
      // If status check says we're not authenticated, return that immediately
      // This avoids unnecessary delay for unauthenticated users
      if (!statusData.isAuthenticated) {
        return { isAuthenticated: false };
      }
    }
  } catch (quickCheckError) {
    console.warn('Quick auth status check failed:', quickCheckError);
    // Continue with main auth check even if quick check fails
  }
  
  // Create a promise that rejects after the timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Authentication check timed out')), timeoutMs);
  });
  
  // Create the actual auth check promise
  const authPromise = fetch('/api/auth/check', {
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
    }
  }).then(response => {
    if (!response.ok) throw new Error(`Auth check failed: ${response.status}`);
    return response.json();
  });
  
  // Race the auth check against the timeout
  try {
    return await Promise.race([authPromise, timeoutPromise]);
  } catch (error) {
    console.error('Auth check failed with timeout or error:', error);
    
    // Try the simpler status endpoint as fallback
    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const statusResponse = await fetch(`${backendUrl}/api/auth/status`, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
        // Even shorter timeout for the fallback
        signal: AbortSignal.timeout(2000)
      });
      
      if (statusResponse.ok) {
        return await statusResponse.json();
      }
    } catch (fallbackError) {
      console.error('Fallback auth check also failed:', fallbackError);
    }
    
    // If all fails, return not authenticated
    return { isAuthenticated: false };
  }
};
