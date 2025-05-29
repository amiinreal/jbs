import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate for redirection

// 1. Create AuthContext
const AuthContext = createContext();

// 2. Create AuthProvider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true); // To handle initial auth check loading state
  const navigate = useNavigate(); // For redirection

  // 3. Login function
  const login = (userData) => {
    // Assuming userData from backend is { success: true, token: "...", user: { id: ..., username: ..., ... } }
    if (userData && userData.success && userData.user) {
      setCurrentUser(userData.user);
      // setToken(userData.token); // No longer using token from login response directly
      setIsAuthenticated(true);
      localStorage.setItem('sessionActive', 'true'); // Indicate active session
      // Optionally, navigate to a default page after login, e.g., dashboard
      // navigate('/dashboard'); 
    } else {
      console.error("Login failed: userData structure is incorrect or success is false.", userData);
      // Handle incorrect userData structure if necessary
      // Ensure to clear any session indication if login was attempted but failed
      localStorage.removeItem('sessionActive');
    }
  };

  // 4. Logout function
  const logout = () => {
    setCurrentUser(null);
    // setToken(null); // Token state no longer primary auth indicator
    setIsAuthenticated(false);
    localStorage.removeItem('sessionActive'); // Remove session activity flag
    // Redirect to login page or homepage
    navigate('/login'); 
  };

  // Function to refresh user data from backend (e.g., after verification)
  const refreshUserData = async () => {
    setLoading(true); // Set loading true while refreshing
    try {
      // Use the /api/auth/check endpoint
      const response = await fetch('/api/auth/check', { 
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Crucial for sending session cookies
      });

      if (response.ok) {
        const data = await response.json();
        // data from /api/auth/check should be { isAuthenticated: true, id: ..., ... }
        // The backend now directly returns the user object compatible with login function's 'user' field
        if (data.isAuthenticated && data.id) { 
          login({ success: true, user: data }); // Call login with the user data from /auth/check
        } else {
          // Session might be invalid or expired on backend
          logout(); // This will clear localStorage 'sessionActive'
        }
      } else {
        // Backend responded with an error
        logout(); // This will clear localStorage 'sessionActive'
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
      logout(); // This will clear localStorage 'sessionActive'
    } finally {
      setLoading(false); // Finished refreshing
    }
  };
  
  // 5. useEffect hook to check auth status on mount
  useEffect(() => {
    const sessionActive = localStorage.getItem('sessionActive');
    if (sessionActive === 'true') {
      refreshUserData(); // Call the new refresh function
    } else {
      // No active session in localStorage
      setIsAuthenticated(false); 
      setCurrentUser(null);
      setLoading(false); // Finished initial auth check (no session to verify)
    }
  }, []); // Empty dependency array means this runs once on mount

  // Derived states for convenience (optional, but can be useful)
  const isCompany = currentUser?.is_company || false;
  const isVerifiedCompany = currentUser?.is_verified_company || false;
  const isAdmin = currentUser?.role === 'admin';


  // 6. Provider value
  const value = {
    currentUser,
    isAuthenticated,
    token,
    login,
    logout,
    loading, // Provide loading state for UI to respond to auth check
    refreshUserData, // Expose the refresh function
    // Optional derived states:
    isCompany,
    isVerifiedCompany,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children} {/* Render children only after initial auth check is complete */}
    </AuthContext.Provider>
  );
};

// 7. Custom hook useAuth
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 8. Export AuthContext (optional, if needed directly elsewhere, but useAuth is preferred)
 export { AuthContext }; // Typically useAuth is sufficient for consumers

