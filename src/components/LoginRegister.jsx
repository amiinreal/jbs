import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './LoginRegister.css';
// login and register from authUtils are removed as we'll use AuthContext or direct fetch
// import { login as apiLogin, register as apiRegister } from '../utils/authUtils'; // Renamed to avoid conflict
import { useAuth } from '../contexts/AuthContext'; // Import useAuth
import { checkDatabaseConnection } from '../utils/databaseCheck';
import LoadingSpinner from './common/LoadingSpinner';
import LoadingOverlay from './common/LoadingOverlay';

const LoginRegister = ({ initialTab }) => { // Removed setIsAuthenticated prop
  const navigate = useNavigate();
  const location = useLocation();
  const { login: authContextLogin, isAuthenticated } = useAuth(); // Get login from AuthContext

  const [isLogin, setIsLogin] = useState(initialTab !== 'register');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [redirectTo, setRedirectTo] = useState('/dashboard');
  const [dbConnected, setDbConnected] = useState(true);
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Parse query parameters for redirect
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const redirect = queryParams.get('redirect');
    
    if (redirect) {
      setRedirectTo(`/${redirect}`);
    }
    
    // Check for stored redirect path
    const storedRedirect = sessionStorage.getItem('redirectAfterLogin');
    if (storedRedirect) {
      setRedirectTo(storedRedirect);
    }
    
    // Check if we were redirected from a protected route
    if (location.state && location.state.from) {
      setRedirectTo(location.state.from);
    }
  }, [location]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const path = redirectTo || '/dashboard';
      console.log(`Already authenticated, redirecting to ${path}`);
      navigate(path, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTo]);

  // Check database connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      const connected = await checkDatabaseConnection();
      setDbConnected(connected);
      if (!connected) {
        setError('Warning: Database connection issues detected. Login may not work correctly.');
      }
    };
    
    checkConnection();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitted(true);
    setLoading(true);
    setError(null);
    
    // Form validation
    if (isLogin) {
      if (!formData.username || !formData.password) {
        setError('Please enter both username and password');
        setLoading(false);
        return;
      }
    } else {
      // Registration validation
      if (!formData.username || !formData.email || !formData.password) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }
      
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
      
      // Password strength validation
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters long');
        setLoading(false);
        return;
      }
    }

    try {
      console.log("Attempting authentication...");
      
      if (isLogin) {
        // Using direct fetch for login
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: formData.username.trim(), password: formData.password }),
        });
        const data = await response.json();

        if (response.ok && data.success) {
          console.log("Login successful via API:", data);
          authContextLogin(data); // Pass the whole data object { success, user, token, message }
          // Redirection is now handled by the useEffect watching isAuthenticated
          const redirectPath = redirectTo || '/dashboard';
          sessionStorage.removeItem('redirectAfterLogin'); // Clean up
          navigate(redirectPath, { replace: true }); // Explicit navigation after context update
        } else {
          throw new Error(data.error || 'Login failed');
        }
      } else {
        // Using direct fetch for registration
        const registerResponse = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.username.trim(),
            email: formData.email.trim(),
            password: formData.password,
          }),
        });
        const registerData = await registerResponse.json();

        if (registerResponse.ok && registerData.success) {
          // Automatically log in after successful registration
          const loginResponse = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: formData.username.trim(), password: formData.password }),
          });
          const loginData = await loginResponse.json();

          if (loginResponse.ok && loginData.success) {
            authContextLogin(loginData);
            const redirectPath = redirectTo || '/dashboard';
            sessionStorage.removeItem('redirectAfterLogin');
            navigate(redirectPath, { replace: true });
          } else {
            // If auto-login fails, redirect to login page with a message
            setError('Registration successful, but auto-login failed. Please log in manually.');
            setIsLogin(true); // Switch to login tab
          }
        } else {
          throw new Error(registerData.error || 'Registration failed');
        }
      }
    } catch (apiError) {
      console.error('API Auth error:', apiError);
      // More specific error handling based on typical API responses
      if (apiError.message.includes('Invalid username or password')) {
        setError('Invalid username or password. Please try again.');
      } else if (apiError.message.includes('already taken')) {
        setError(apiError.message);
      } else if (apiError.message.includes('500') || apiError.message.includes('Server error')) {
        setError('Server error. Please try again later.');
      } else if (apiError.message.toLowerCase().includes('failed to fetch')) {
         setError('Network error. Please check your connection or try again later.');
      }
      else {
        setError(apiError.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
      setFormSubmitted(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setFormSubmitted(false);
  };

  return (
    <LoadingOverlay isLoading={loading && formSubmitted} text={isLogin ? "Logging in..." : "Creating account..."}>
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>{isLogin ? 'Login to Your Account' : 'Create an Account'}</h2>
            <p>{isLogin ? 'Welcome back!' : 'Join our community today'}</p>
          </div>
          
          {!dbConnected && (
            <div className="auth-warning">
              <p>Database connection issue detected. Authentication services may be unavailable.</p>
            </div>
          )}
          
          {error && (
            <div className="auth-error">
              <p>{error}</p>
            </div>
          )}
          
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
                disabled={loading}
                required
                autoComplete="username"
                aria-invalid={formSubmitted && !formData.username ? "true" : "false"}
              />
            </div>
            
            {!isLogin && (
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  disabled={loading}
                  required
                  autoComplete="email"
                  aria-invalid={formSubmitted && !formData.email ? "true" : "false"}
                />
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                disabled={loading}
                required
                autoComplete={isLogin ? "current-password" : "new-password"}
                aria-invalid={formSubmitted && !formData.password ? "true" : "false"}
              />
            </div>
            
            {!isLogin && (
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  disabled={loading}
                  required
                  autoComplete="new-password"
                  aria-invalid={formSubmitted && formData.password !== formData.confirmPassword ? "true" : "false"}
                />
              </div>
            )}
            
            <button 
              type="submit" 
              className="auth-button" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="small" color="light" />
                  <span className="ml-2">Processing...</span>
                </>
              ) : (
                isLogin ? 'Login' : 'Register'
              )}
            </button>
          </form>
          
          <div className="auth-footer">
            <p>
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button 
                type="button" 
                className="auth-toggle-button"
                onClick={toggleAuthMode}
                disabled={loading}
              >
                {isLogin ? 'Register' : 'Login'}
              </button>
            </p>
            
            {isLogin && (
              <div className="additional-options">
                <p>
                  <Link to="/forgot-password" className="forgot-password-link">
                    Forgot your password?
                  </Link>
                </p>
                <p>
                  Are you a business? 
                  <Link to="/company-registration" className="company-register-link">
                    Register as Company
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </LoadingOverlay>
  );
};

export default LoginRegister;