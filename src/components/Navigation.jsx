import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/navigation.css';
import LoadingSpinner from './common/LoadingSpinner';
import { getAuthUserFromStorage } from '../utils/authUtils';

const Navigation = ({ user, isAuthenticated, setIsAuthenticated, handleLogout, authLoading }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [localAuthLoading, setLocalAuthLoading] = useState(authLoading);
  const userMenuRef = useRef(null);
  const authTimeoutRef = useRef(null);
  const [cachedUser, setCachedUser] = useState(null);
  
  // Load initial user from localStorage to avoid UI flicker
  useEffect(() => {
    const storedUser = getAuthUserFromStorage();
    if (storedUser) {
      setCachedUser(storedUser);
    }
  }, []);
  
  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuRef]);

  // Handle loading timeouts
  useEffect(() => {
    // Set a short independent timeout for UI display purposes
    const uiTimeoutId = setTimeout(() => {
      setIsLoaded(true);
      setLocalAuthLoading(false);
    }, 2000);
    
    if (authLoading) {
      // If authLoading is still true after 2 seconds, something might be stuck
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
      
      authTimeoutRef.current = setTimeout(() => {
        console.warn('Navigation auth display timeout reached');
        setIsLoaded(true);
        setLocalAuthLoading(false);
      }, 2000);
    } else {
      setIsLoaded(true);
      setLocalAuthLoading(false);
      clearTimeout(uiTimeoutId);
    }
    
    return () => {
      clearTimeout(uiTimeoutId);
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
    };
  }, [authLoading]);
  
  // Update local loading state when prop changes
  useEffect(() => {
    setLocalAuthLoading(authLoading);
  }, [authLoading]);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  // Use either the authenticated user or cached user from localStorage
  const displayUser = user || cachedUser;
  const showAuthenticatedUI = isAuthenticated || !!cachedUser;

  return (
    <nav className={`main-navigation ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-container">
        <div className="nav-left">
          <Link to="/" className="site-logo">JBS</Link>
          <button 
            className={`menu-toggle ${menuOpen ? 'active' : ''}`}
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
        
        <div className={`nav-center ${menuOpen ? 'open' : ''}`}>
          <ul className="nav-links">
            <li><Link to="/jobs" className={location.pathname === '/jobs' ? 'active' : ''} onClick={closeMenu}>Jobs</Link></li>
            <li><Link to="/houses" className={location.pathname === '/houses' ? 'active' : ''} onClick={closeMenu}>Houses</Link></li>
            <li><Link to="/cars" className={location.pathname === '/cars' ? 'active' : ''} onClick={closeMenu}>Cars</Link></li>
            <li><Link to="/items" className={location.pathname === '/items' ? 'active' : ''} onClick={closeMenu}>Items</Link></li>
          </ul>
        </div>
        
        <div className="nav-right">
          {(localAuthLoading && !isLoaded) ? (
            <div className="auth-loading">
              <LoadingSpinner size="small" color="primary" />
              <span className="loading-text">Loading...</span>
            </div>
          ) : showAuthenticatedUI ? (
            <>
              <Link to="/new-ad" className="post-ad-button" onClick={closeMenu}>Post Ad</Link>
              <div className="user-menu-container" ref={userMenuRef}>
                <button 
                  className="user-menu-button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <span className="user-avatar">
                    {displayUser?.username ? displayUser.username[0].toUpperCase() : '?'}
                  </span>
                  <span className="user-menu-text">{displayUser?.username || 'User'}</span>
                  <span className={`menu-arrow ${userMenuOpen ? 'open' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="6" fill="none" viewBox="0 0 12 6">
                      <path fill="currentColor" d="M6 6l6-6H0l6 6z"/>
                    </svg>
                  </span>
                </button>
                
                {userMenuOpen && (
                  <div className="user-dropdown">
                    <Link to="/dashboard" onClick={() => setUserMenuOpen(false)}>Dashboard</Link>
                    <Link to="/messages" onClick={() => setUserMenuOpen(false)}>Messages</Link>
                    <Link to="/my-listings" onClick={() => setUserMenuOpen(false)}>My Listings</Link>
                    {displayUser?.isCompany && (
                      <Link to="/company-profile" onClick={() => setUserMenuOpen(false)}>Company Profile</Link>
                    )}
                    {displayUser?.role === 'admin' && (
                      <Link to="/admin" onClick={() => setUserMenuOpen(false)}>Admin</Link>
                    )}
                    <button 
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="logout-button"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="login-button" onClick={closeMenu}>Login</Link>
              <Link to="/register" className="register-button" onClick={closeMenu}>Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
