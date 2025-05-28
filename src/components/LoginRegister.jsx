import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './LoginRegister.css';
import { login, register } from '../utils/authUtils';
import { checkDatabaseConnection } from '../utils/databaseCheck';
import LoadingSpinner from './common/LoadingSpinner';
import LoadingOverlay from './common/LoadingOverlay';

const LoginRegister = ({ setIsAuthenticated, initialTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
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
        try {
          const loginData = await login({
            username: formData.username.trim(),
            password: formData.password
          });
          
          console.log("Login successful:", loginData);
          
          // Check if login was successful
          if (loginData.success) {
            // Update authentication state
            setIsAuthenticated(true);
            
            // Clear any stored redirect path
            const redirectPath = redirectTo;
            sessionStorage.removeItem('redirectAfterLogin');
            
            // Redirect to dashboard or stored path
            navigate(redirectPath);
          } else {
            throw new Error(loginData.error || 'Login failed');
          }
        } catch (loginError) {
          console.error('Login error:', loginError);
          
          // Provide more user-friendly error message
          if (loginError.message.includes('403') || loginError.message.includes('401')) {
            setError('Invalid username or password. Please try again.');
          } else if (loginError.message.includes('500')) {
            setError('Server error. Please try again later.');
          } else if (loginError.message.includes('Invalid response format')) {
            setError('Authentication service is temporarily unavailable. Please try again later.');
          } else {
            setError(loginError.message || 'An unexpected error occurred. Please try again.');
          }
        }
      } else {
        try {
          const registerData = await register({
            username: formData.username.trim(),
            email: formData.email.trim(),
            password: formData.password
          });
          
          if (registerData.success) {
            // For registration, log user in automatically
            const loginData = await login({
              username: formData.username.trim(),
              password: formData.password
            });
            
            // Update authentication state
            setIsAuthenticated(true);
            
            // Clear any stored redirect path
            const redirectPath = redirectTo;
            sessionStorage.removeItem('redirectAfterLogin');
            
            // Show success message before redirecting
            setError(null);
            
            // Redirect to dashboard or stored path
            setTimeout(() => {
              navigate(redirectPath);
            }, 1000);
          } else {
            throw new Error(registerData.error || 'Registration failed');
          }
        } catch (registerError) {
          console.error('Registration error:', registerError);
          
          // Provide more user-friendly error message for registration
          if (registerError.message.includes('already taken')) {
            setError(registerError.message);
          } else if (registerError.message.includes('500')) {
            setError('Server error during registration. Please try again later.');
          } else {
            setError(registerError.message || 'Registration failed. Please try again.');
          }
        }
      }
      
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
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