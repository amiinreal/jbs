import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './TopMenu.css';

const TopMenu = ({ isAuthenticated, setIsAuthenticated, userRole }) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setIsAuthenticated(false);
        navigate('/');
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="top-menu">
      <div className="logo">
        <Link to="/">JBS</Link>
      </div>
      
      <div className="nav-links">
        <Link to="/jobs" className="nav-link">Jobs</Link>
        <Link to="/houses" className="nav-link">Houses</Link>
        <Link to="/cars" className="nav-link">Cars</Link>
        <Link to="/items" className="nav-link">Marketplace</Link>
      </div>
      
      <div className="auth-links">
        {isAuthenticated ? (
          <>
            <div className="user-menu" onClick={() => setUserMenuOpen(!userMenuOpen)}>
              <span>My Account</span>
              <i className={`fas fa-chevron-${userMenuOpen ? 'up' : 'down'}`}></i>
              
              {userMenuOpen && (
                <div className="dropdown-menu">
                  <Link to="/dashboard" onClick={() => setUserMenuOpen(false)}>Dashboard</Link>
                  <Link to="/messages" onClick={() => setUserMenuOpen(false)}>Messages</Link>
                  <Link to="/my-listings" onClick={() => setUserMenuOpen(false)}>My Listings</Link>
                  {userRole === 'admin' && (
                    <Link to="/admin" onClick={() => setUserMenuOpen(false)}>Admin Panel</Link>
                  )}
                  <div className="dropdown-divider"></div>
                  <button onClick={handleLogout}>Logout</button>
                </div>
              )}
            </div>
            <Link to="/new-ad" className="post-ad-btn">Post Ad</Link>
          </>
        ) : (
          <>
            <Link to="/login" className="login-btn">Login</Link>
            <Link to="/register" className="register-btn">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default TopMenu;