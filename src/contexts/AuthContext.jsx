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
    if (userData && userData.token && userData.user) {
      setCurrentUser(userData.user);
      setToken(userData.token);
      setIsAuthenticated(true);
      localStorage.setItem('token', userData.token);
      // Optionally, navigate to a default page after login, e.g., dashboard
      // navigate('/dashboard'); 
    } else {
      console.error("Login failed: userData structure is incorrect.", userData);
      // Handle incorrect userData structure if necessary
    }
  };

  // 4. Logout function
  const logout = () => {
    setCurrentUser(null);
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    // Redirect to login page or homepage
    navigate('/login'); 
  };

  // 5. useEffect hook to check auth status on mount
  useEffect(() => {
    const verifyTokenAndFetchUser = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          // Use the /api/auth/check endpoint as it seems to serve this purpose
          const response = await fetch('/api/auth/check', { 
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${storedToken}`,
              'Content-Type': 'application/json',
            },
            credentials: 'include', // Important if session cookies are involved alongside/instead of token
          });

          if (response.ok) {
            const data = await response.json();
            if (data.isAuthenticated && data.id) { // Check for a valid user object from /api/auth/check
              // The backend /api/auth/check endpoint returns user details directly
              // For example: { isAuthenticated: true, id: ..., username: ..., email: ..., role: ... }
              login({ user: data, token: storedToken }); // Pass the whole user data object
            } else {
              // Token might be invalid or session expired on backend
              logout(); // Clear client-side auth state
            }
          } else {
            // Backend responded with an error (e.g., 401 Unauthorized)
            logout(); // Clear client-side auth state
          }
        } catch (error) {
          console.error('Error verifying token:', error);
          logout(); // Clear client-side auth state on error
        }
      } else {
        setIsAuthenticated(false); // No token found
        setCurrentUser(null);
      }
      setLoading(false); // Finished initial auth check
    };

    verifyTokenAndFetchUser();
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
// export { AuthContext }; // Typically useAuth is sufficient for consumers
[end of src/contexts/AuthContext.jsx]
