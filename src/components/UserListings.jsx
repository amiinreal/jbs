import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './UserListings.css';

const UserListings = ({ userId }) => {
  const [userListings, setUserListings] = useState({
    jobs: [],
    houses: [],
    cars: [],
    items: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchUserListings = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/user/listings', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch listings: ${response.status}`);
        }
        
        const data = await response.json();
        
        setUserListings({
          jobs: Array.isArray(data.jobs) ? data.jobs : [],
          houses: Array.isArray(data.houses) ? data.houses : [],
          cars: Array.isArray(data.cars) ? data.cars : [],
          items: Array.isArray(data.items) ? data.items : []
        });
      } catch (err) {
        console.error('Error fetching user listings:', err);
        setError(err.message || 'Failed to load your listings. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserListings();
  }, [userId]);
  
  // Handle deleting a listing
  const handleDelete = async (type, id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/${type}s/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete ${type}`);
      }
      
      // Update listings after successful delete
      setUserListings(prev => ({
        ...prev,
        [type + 's']: prev[type + 's'].filter(item => item.id !== id)
      }));
      
      alert(`${type} deleted successfully!`);
    } catch (err) {
      console.error(`Error deleting ${type}:`, err);
      alert(err.message || `Failed to delete ${type}. Please try again.`);
    }
  };
  
  // Toggle publish status
  const togglePublishStatus = async (type, id, currentStatus) => {
    try {
      const response = await fetch(`/api/${type}s/${id}/publish`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ is_published: !currentStatus })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update ${type} status`);
      }
      
      // Update listings after successful status toggle
      setUserListings(prev => ({
        ...prev,
        [type + 's']: prev[type + 's'].map(item => 
          item.id === id ? { ...item, is_published: !currentStatus } : item
        )
      }));
    } catch (err) {
      console.error(`Error updating ${type} status:`, err);
      alert(err.message || `Failed to update ${type} status. Please try again.`);
    }
  };
  
  return (
    <div className="user-listings-container">
      <h1>My Listings</h1>
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your listings...</p>
        </div>
      ) : error ? (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Retry
          </button>
        </div>
      ) : (
        <div className="listings-tabs">
          <div className="listings-tab-headers">
            <button className="tab-button active">All</button>
            <button className="tab-button">Houses ({userListings.houses.length})</button>
            <button className="tab-button">Cars ({userListings.cars.length})</button>
            <button className="tab-button">Items ({userListings.items.length})</button>
            {userListings.jobs.length > 0 && (
              <button className="tab-button">Jobs ({userListings.jobs.length})</button>
            )}
          </div>
          
          <div className="tab-content">
            {/* Houses */}
            <div className="listing-section">
              <div className="section-header">
                <h2>Houses</h2>
                <Link to="/add-house-listing" className="add-button">+ Add House</Link>
              </div>
              
              {userListings.houses.length === 0 ? (
                <div className="empty-listings">
                  <p>You don't have any house listings yet.</p>
                  <Link to="/add-house-listing" className="add-listing-link">Add your first house</Link>
                </div>
              ) : (
                <div className="listings-table">
                  <div className="table-header">
                    <div className="header-cell">Address</div>
                    <div className="header-cell">Price</div>
                    <div className="header-cell">Status</div>
                    <div className="header-cell">Actions</div>
                  </div>
                  
                  {userListings.houses.map(house => (
                    <div key={house.id} className="listing-row">
                      <div className="listing-cell">{house.address || 'No address'}</div>
                      <div className="listing-cell">${house.price?.toLocaleString() || 'N/A'}</div>
                      <div className="listing-cell">
                        <span className={`status-badge ${house.is_published ? 'published' : 'unpublished'}`}>
                          {house.is_published ? 'Published' : 'Unpublished'}
                        </span>
                      </div>
                      <div className="listing-cell actions">
                        <button 
                          onClick={() => togglePublishStatus('house', house.id, house.is_published)}
                          className={`status-toggle ${house.is_published ? 'unpublish' : 'publish'}`}
                        >
                          {house.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                        <Link to={`/edit-house-listing/${house.id}`} className="edit-button">Edit</Link>
                        <button 
                          onClick={() => handleDelete('house', house.id)}
                          className="delete-button"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Cars */}
            <div className="listing-section">
              <div className="section-header">
                <h2>Cars</h2>
                <Link to="/add-car" className="add-button">+ Add Car</Link>
              </div>
              
              {userListings.cars.length === 0 ? (
                <div className="empty-listings">
                  <p>You don't have any car listings yet.</p>
                  <Link to="/add-car" className="add-listing-link">Add your first car</Link>
                </div>
              ) : (
                <div className="listings-table">
                  {/* Similar structure to houses */}
                </div>
              )}
            </div>
            
            {/* Items */}
            <div className="listing-section">
              <div className="section-header">
                <h2>Items</h2>
                <Link to="/add-item" className="add-button">+ Add Item</Link>
              </div>
              
              {userListings.items.length === 0 ? (
                <div className="empty-listings">
                  <p>You don't have any item listings yet.</p>
                  <Link to="/add-item" className="add-listing-link">Add your first item</Link>
                </div>
              ) : (
                <div className="listings-table">
                  {/* Similar structure to houses */}
                </div>
              )}
            </div>
            
            {/* Jobs (if user is company) */}
            {userListings.jobs.length > 0 && (
              <div className="listing-section">
                <div className="section-header">
                  <h2>Jobs</h2>
                  <Link to="/add-job" className="add-button">+ Add Job</Link>
                </div>
                
                <div className="listings-table">
                  {/* Similar structure to houses */}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserListings;
