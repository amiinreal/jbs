import React from 'react';
import { Link } from 'react-router-dom';
import jobsIcon from '../assets/icons/jobs.svg';
import housesIcon from '../assets/icons/houses.svg';
import carsIcon from '../assets/icons/cars.svg';
import itemsIcon from '../assets/icons/items.svg';
import './LandingPage.css';

const LandingPage = ({ isAuthenticated }) => {
  return (
    <div className="landing-container">
      <h1>Welcome to Our Marketplace</h1>
      <div className="categories-grid">
        <div className="category-box">
          <h2>Jobs</h2>
          {/* Use imported SVG or emoji as fallback */}
          {jobsIcon ? (
            <img src={jobsIcon} alt="Jobs Icon" className="category-icon" />
          ) : (
            <span className="fallback-icon">💼</span>
          )}
          <p>Find your dream job here.</p>
          <Link to="/jobs" className="view-link">View Jobs</Link>
        </div>
        
        <div className="category-box">
          <h2>Houses</h2>
          {housesIcon ? (
            <img src={housesIcon} alt="Houses Icon" className="category-icon" />
          ) : (
            <span className="fallback-icon">🏠</span>
          )}
          <p>Explore various housing options.</p>
          <Link to="/houses" className="view-link">View Houses</Link>
        </div>
        
        <div className="category-box">
          <h2>Cars</h2>
          {carsIcon ? (
            <img src={carsIcon} alt="Cars Icon" className="category-icon" />
          ) : (
            <span className="fallback-icon">🚗</span>
          )}
          <p>Discover cars from top brands.</p>
          <Link to="/cars" className="view-link">View Cars</Link>
        </div>
        
        <div className="category-box">
          <h2>Items</h2>
          {itemsIcon ? (
            <img src={itemsIcon} alt="Items Icon" className="category-icon" />
          ) : (
            <span className="fallback-icon">📦</span>
          )}
          <p>Shop for everyday items.</p>
          <Link to="/items" className="view-link">View Items</Link>
        </div>
      </div>
      
      <div className="marketplace-info">
        <h2>About Our Marketplace</h2>
        <p>
          We provide a platform where you can browse and search for jobs, houses, 
          cars, and everyday items. Sign up to post your own listings and connect with others.
        </p>
        <div className="cta-buttons">
          <Link to="/register" className="cta-button">Sign Up</Link>
          <Link to="/login" className="cta-button secondary">Login</Link>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;