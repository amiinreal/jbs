import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/navigation.css';
import LoadingSpinner from './common/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth

// Removed props: user, isAuthenticated, setIsAuthenticated, handleLogout, authLoading
const Navigation = () => { 
  const { currentUser, isAuthenticated, logout, isCompany, isAdmin, loading: authLoading } = useAuth();
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const userMenuRef = useRef(null);
  
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

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
    setUserMenuOpen(false); // Also close user menu if open
  };

  const handleLogoutClick = () => {
    setUserMenuOpen(false);
    logout(); // Call logout from AuthContext
  };

  // Use currentUser from AuthContext directly
  const displayUser = currentUser; 

  return (
    <nav className={`main-navigation ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-container">
        <div className="nav-left">
          <Link to="/" className="site-logo" onClick={closeMenu}>JBS</Link>
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
          {authLoading ? ( // Use loading state from AuthContext
            <div className="auth-loading">
              <LoadingSpinner size="small" color="primary" />
              <span className="loading-text">Loading...</span>
            </div>
          ) : isAuthenticated ? ( // Use isAuthenticated from AuthContext
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
                    <Link to="/dashboard" onClick={closeMenu}>Dashboard</Link>
                    <Link to="/messages" onClick={closeMenu}>Messages</Link>
                    <Link to="/my-listings" onClick={closeMenu}>My Listings</Link>
                    {isCompany && ( // Use isCompany from AuthContext
                      <>
                        <Link to="/company-profile" onClick={closeMenu}>Company Profile</Link>
                        <Link to="/manage-jobs" onClick={closeMenu}>Manage Jobs</Link> 
                      </>
                    )}
                    {isAdmin && ( // Use isAdmin from AuthContext
                      <Link to="/admin" onClick={closeMenu}>Admin</Link>
                    )}
                    <button 
                      onClick={handleLogoutClick} // Use the new handler
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
