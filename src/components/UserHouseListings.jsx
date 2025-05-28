import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './UserHouseListings.css';

const UserHouseListings = ({ userId }) => {
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updateStatus, setUpdateStatus] = useState({ id: null, status: null });
  const [filter, setFilter] = useState('all'); // Options: 'all', 'published', 'unpublished'

  // Fetch user's house listings
  useEffect(() => {
    const fetchUserHouses = async () => {
      try {
        setLoading(true);
        // Fix API endpoint to match backend route
        const response = await fetch(`/api/houses/user`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        setHouses(data.data || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching houses:', err);
        setError('Failed to load your house listings. Please try again.');
        setLoading(false);
      }
    };

    fetchUserHouses();
  }, [userId]);

  // Toggle publication status with improved error handling
  const togglePublishStatus = async (id, currentStatus) => {
    try {
      setUpdateStatus({ id, status: 'updating' });
      
      // Log the request for debugging
      console.log(`Toggling house #${id} to ${!currentStatus ? 'published' : 'unpublished'}`);
      
      const response = await fetch(`/api/houses/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ is_published: !currentStatus })
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('Error response:', responseData);
        throw new Error(responseData.error || `Error updating status: ${response.status}`);
      }

      console.log('Update successful:', responseData);
      
      // Update houses state after successful update
      setHouses(houses.map(house => 
        house.id === id ? { ...house, is_published: !currentStatus } : house
      ));
      setUpdateStatus({ id, status: 'success' });
      
      // Show temporary success message
      setTimeout(() => {
        setUpdateStatus({ id: null, status: null });
      }, 2000);
    } catch (err) {
      console.error('Error toggling publish status:', err);
      setUpdateStatus({ id, status: 'error' });
      
      // Clear error message after delay
      setTimeout(() => {
        setUpdateStatus({ id: null, status: null });
      }, 3000);
    }
  };

  // Delete house listing
  const deleteHouseListing = async (id) => {
    if (!window.confirm('Are you sure you want to delete this listing? This cannot be undone.')) {
      return;
    }
    
    try {
      setUpdateStatus({ id, status: 'deleting' });
      
      const response = await fetch(`/api/houses/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Error deleting listing: ${response.status}`);
      }

      // Remove from state after successful delete
      setHouses(houses.filter(house => house.id !== id));
      setUpdateStatus({ id: null, status: 'deleted' });
      
      // Clear status after delay
      setTimeout(() => {
        setUpdateStatus({ id: null, status: null });
      }, 2000);
    } catch (err) {
      console.error('Error deleting house listing:', err);
      setUpdateStatus({ id, status: 'error' });
      
      // Clear error message after delay
      setTimeout(() => {
        setUpdateStatus({ id: null, status: null });
      }, 3000);
    }
  };

  // Filter houses based on selected filter
  const filteredHouses = houses.filter(house => {
    if (filter === 'all') return true;
    if (filter === 'published') return house.is_published;
    if (filter === 'unpublished') return !house.is_published;
    return true;
  });

  // Format price for display
  const formatPrice = (price) => {
    if (!price) return 'Price on request';
    return `$${Number(price).toLocaleString()}`;
  };

  return (
    <div className="user-houses-container">
      <h2>Your House Listings</h2>
      
      {loading && (
        <div className="loading-wrapper">
          <div className="loading-spinner"></div>
          <p>Loading your listings...</p>
        </div>
      )}
      
      {error && !loading && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}
      
      {!loading && !error && houses.length === 0 && (
        <div className="no-listings">
          <p>You haven't posted any house listings yet.</p>
          <Link to="/add-house-listing" className="add-listing-btn">Add Your First Listing</Link>
        </div>
      )}
      
      {!loading && !error && houses.length > 0 && (
        <>
          <div className="listings-controls">
            <Link to="/add-house-listing" className="add-listing-btn">Add New Listing</Link>
            
            <div className="filter-buttons">
              <button 
                className={`filter-btn ${filter === 'all' ? 'active' : ''}`} 
                onClick={() => setFilter('all')}
              >
                All ({houses.length})
              </button>
              <button 
                className={`filter-btn ${filter === 'published' ? 'active' : ''}`} 
                onClick={() => setFilter('published')}
              >
                Published ({houses.filter(h => h.is_published).length})
              </button>
              <button 
                className={`filter-btn ${filter === 'unpublished' ? 'active' : ''}`} 
                onClick={() => setFilter('unpublished')}
              >
                Unpublished ({houses.filter(h => !h.is_published).length})
              </button>
            </div>
            
            <div className="listings-count">{filteredHouses.length} {filteredHouses.length === 1 ? 'Listing' : 'Listings'} shown</div>
          </div>
          
          <div className="house-listings-table">
            <div className="house-listings-header">
              <div className="header-cell">Status</div>
              <div className="header-cell">Address</div>
              <div className="header-cell">Price</div>
              <div className="header-cell">Details</div>
              <div className="header-cell">Square Footage</div>
              <div className="header-cell">Actions</div>
            </div>
            
            {filteredHouses.map(house => (
              <div key={house.id} className={`house-listing-row ${house.is_published ? 'published' : 'unpublished'}`}>
                <div className="listing-cell status-cell" data-label="Status">
                  <span className={`status-indicator ${house.is_published ? 'status-published' : 'status-unpublished'}`}>
                    {house.is_published ? 'Published' : 'Unpublished'}
                  </span>
                </div>
                
                <div className="listing-cell address-cell" data-label="Address">
                  {house.address || 'No address provided'}
                </div>
                
                <div className="listing-cell price-cell" data-label="Price">
                  {formatPrice(house.price)}
                </div>
                
                <div className="listing-cell details-cell" data-label="Details">
                  <span>{house.number_of_bedrooms || 0} bed</span>
                  <span>{house.number_of_bathrooms || 0} bath</span>
                </div>
                
                <div className="listing-cell footage-cell" data-label="Square Footage">
                  {house.square_footage ? `${house.square_footage.toLocaleString()} sq ft` : 'Not specified'}
                </div>
                
                <div className="listing-cell actions-cell">
                  <button 
                    className={`publish-toggle-btn ${house.is_published ? 'unpublish' : 'publish'}`}
                    onClick={() => togglePublishStatus(house.id, house.is_published)}
                    disabled={updateStatus.id === house.id && updateStatus.status === 'updating'}
                  >
                    {updateStatus.id === house.id && updateStatus.status === 'updating' 
                      ? 'Updating...' 
                      : house.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                  
                  <Link 
                    to={`/edit-house-listing/${house.id}`} 
                    className="edit-btn"
                  >
                    Edit
                  </Link>
                  
                  <button 
                    className="delete-btn"
                    onClick={() => deleteHouseListing(house.id)}
                    disabled={updateStatus.id === house.id && updateStatus.status === 'deleting'}
                  >
                    {updateStatus.id === house.id && updateStatus.status === 'deleting' 
                      ? 'Deleting...' 
                      : 'Delete'}
                  </button>
                </div>
                
                {updateStatus.id === house.id && updateStatus.status === 'error' && (
                  <div className="status-message error">An error occurred. Please try again.</div>
                )}
                
                {updateStatus.id === house.id && updateStatus.status === 'success' && (
                  <div className="status-message success">Successfully updated listing status!</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default UserHouseListings;
