/**
 * Utilities for handling loading states with proper timeout handling
 */

/**
 * Creates an authentication loading controller with timeout protection
 * @param {Function} setLoading - Function to set loading state
 * @param {Function} setAuth - Function to set authentication state
 * @param {Function} setUser - Function to set user data
 * @returns {Object} Loading control functions
 */
export const createAuthLoadingController = (setLoading, setAuth, setUser) => {
  let timeoutId = null;
  
  const startAuthLoading = (timeoutMs = 8000) => {
    // Set loading state to true
    setLoading(true);
    
    // Clear any existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // Create new timeout that will reset auth state if authentication takes too long
    timeoutId = setTimeout(() => {
      console.warn(`Auth loading timed out after ${timeoutMs}ms`);
      
      // Reset loading and auth state
      setLoading(false);
      setAuth(false);
      setUser(null);
      
      // Mark in localStorage for debugging purposes
      try {
        localStorage.setItem('auth_timeout_occurred', 'true');
        localStorage.setItem('auth_timeout_timestamp', new Date().toISOString());
      } catch (e) {
        console.error('Error writing to localStorage:', e);
      }
    }, timeoutMs);
    
    return timeoutId;
  };
  
  const stopAuthLoading = (isAuthenticated, userData) => {
    // Clear timeout if it exists
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    
    // Update authentication state
    setAuth(isAuthenticated);
    setUser(userData);
    
    // Finally turn off loading state
    setLoading(false);
  };
  
  return {
    startAuthLoading,
    stopAuthLoading
  };
};

/**
 * Creates a generic loading controller with timeout
 * @param {Function} setLoading - Function to set loading state
 * @param {Function} onTimeout - Function to call on timeout
 * @returns {Object} Loading control functions
 */
export const createLoadingController = (setLoading, onTimeout) => {
  let timeoutId = null;
  
  const startLoading = (timeoutMs = 10000) => {
    setLoading(true);
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    if (onTimeout) {
      timeoutId = setTimeout(() => {
        console.warn(`Operation timed out after ${timeoutMs}ms`);
        setLoading(false);
        onTimeout();
      }, timeoutMs);
    }
  };
  
  const stopLoading = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    
    setLoading(false);
  };
  
  return {
    startLoading,
    stopLoading
  };
};
