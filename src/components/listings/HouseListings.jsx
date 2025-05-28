import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getImageUrl, getPlaceholderImage } from '../../utils/fileUtils';
import './ListingStyles.css';

const HouseListings = () => {
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHouses = async () => {
      try {
        setLoading(true);
        
        const response = await fetch('/api/houses/public');
        
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }
        
        const data = await response.json();
        setHouses(data.data || []);
      } catch (err) {
        console.error('Error fetching houses:', err);
        setError('Failed to load house listings. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchHouses();
  }, []);

  if (loading) {
    return (
      <div className="listings-container">
        <h1>House Listings</h1>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading house listings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="listings-container">
        <h1>House Listings</h1>
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="listings-container">
      <h1>House Listings</h1>
      
      {houses.length === 0 ? (
        <div className="no-listings">
          <p>No house listings found.</p>
        </div>
      ) : (
        <div className="listings-grid">
          {houses.map(house => {
            const imageUrl = getImageUrl(house) || getPlaceholderImage('house');
            
            return (
              <Link to={`/houses/${house.id}`} key={house.id} className="listing-card">
                <div className="listing-image">
                  <img src={imageUrl} alt={house.address} />
                </div>
                
                <div className="listing-details">
                  <h2 className="listing-title">{house.address}</h2>
                  <p className="listing-price">${house.price?.toLocaleString() || 'Price on request'}</p>
                  
                  <div className="listing-features">
                    <span className="feature">
                      <i className="feature-icon">🛏️</i> {house.number_of_bedrooms} bed
                    </span>
                    <span className="feature">
                      <i className="feature-icon">🚿</i> {house.number_of_bathrooms} bath
                    </span>
                    <span className="feature">
                      <i className="feature-icon">📏</i> {house.square_footage?.toLocaleString()} sqft
                    </span>
                  </div>
                  
                  <p className="listing-description">
                    {house.description?.substring(0, 100)}
                    {house.description?.length > 100 ? '...' : ''}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HouseListings;
