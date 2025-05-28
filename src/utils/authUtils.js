/**
 * Authentication utility functions
 */

/**
 * Check current authentication status with timeout protection
 * @returns {Promise<Object>} Authentication status and user data
 */
export const checkAuthStatus = async () => {
  try {
    // Create a timeout promise that rejects after 5 seconds
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Authentication check timed out')), 5000);
    });
    
    // The actual auth check promise
    const authCheckPromise = async () => {
      try {
        // Use session-based auth check endpoint
        const response = await fetch('/api/auth/check', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Auth check failed with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Store auth data in localStorage for session recovery
        if (data.isAuthenticated) {
          localStorage.setItem('auth_user', JSON.stringify({
            id: data.id,
            username: data.username,
            email: data.email,
            role: data.role,
            isCompany: data.isCompany,
            isVerifiedCompany: data.isVerifiedCompany,
            company_name: data.company_name || '',
            lastVerified: new Date().toISOString()
          }));
        } else {
          // Clear stored auth data if server reports not authenticated
          localStorage.removeItem('auth_user');
        }
        
        return { 
          success: true, 
          isAuthenticated: data.isAuthenticated, 
          user: data.isAuthenticated ? data : null 
        };
      } catch (error) {
        console.error('Authentication check error:', error);
        
        // If fetch failed but we have cached auth data, use it as fallback
        const cachedUser = localStorage.getItem('auth_user');
        if (cachedUser) {
          try {
            const userData = JSON.parse(cachedUser);
            
            // Check if the cached data is less than 1 hour old
            const lastVerified = new Date(userData.lastVerified);
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            
            if (lastVerified > oneHourAgo) {
              console.log('Using cached authentication data due to server error');
              return { 
                success: true, 
                isAuthenticated: true, 
                user: userData,
                fromCache: true
              };
            }
          } catch (cacheError) {
            console.error('Error parsing cached auth data:', cacheError);
          }
        }
        
        return { success: false, isAuthenticated: false, error: error.message };
      }
    };
    
    // Race the auth check against the timeout
    const result = await Promise.race([authCheckPromise(), timeoutPromise]);
    return result;
  } catch (error) {
    console.error('Authentication timed out or failed:', error);
    // Return a safe default state to prevent UI getting stuck
    return { success: false, isAuthenticated: false, error: error.message };
  }
};

/**
 * Login with username/password
 * @param {Object} credentials - The login credentials
 * @returns {Promise<Object>} Login result
 */
export const login = async (credentials) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(credentials)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `Login failed (${response.status})`);
    }
    
    // Store auth data in localStorage for recovering sessions
    if (data.success && data.user) {
      localStorage.setItem('auth_user', JSON.stringify({
        ...data.user,
        lastVerified: new Date().toISOString()
      }));
    }
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

/**
 * Register a new user account
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Registration result
 */
export const register = async (userData) => {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `Registration failed (${response.status})`);
    }
    
    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

/**
 * Force logout the current user
 * @returns {Promise<boolean>} Success status
 */
export const forceLogout = async () => {
  try {
    // Remove auth data from localStorage
    localStorage.removeItem('auth_user');
    
    // Call logout endpoint
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return true;
  } catch (error) {
    console.error('Force logout error:', error);
    return false;
  }
};

/**
 * Get authenticated user from localStorage (if available)
 * @returns {Object|null} User object or null if not authenticated
 */
export const getAuthUserFromStorage = () => {
  try {
    const authUser = localStorage.getItem('auth_user');
    if (!authUser) return null;
    
    const userData = JSON.parse(authUser);
    
    // Check if the cached data is less than 1 hour old
    const lastVerified = new Date(userData.lastVerified);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    return lastVerified > oneHourAgo ? userData : null;
  } catch (error) {
    console.error('Error getting auth user from storage:', error);
    return null;
  }
};
