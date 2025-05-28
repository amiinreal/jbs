import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/dashboard.css';
import LoadingSpinner from './common/LoadingSpinner';

const Dashboard = ({ userRole, isCompany, isVerifiedCompany }) => {
  const [userListings, setUserListings] = useState({
    jobs: [],
    houses: [],
    cars: [],
    items: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add messageCount state
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    const fetchUserListings = async () => {
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
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Server responded with ${response.status}`);
        }
        
        const data = await response.json();
        // Make sure we have valid arrays for each listing type
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

    // Modify unread message count fetch to handle missing API
    const fetchUnreadMessageCount = async () => {
      try {
        const response = await fetch('/api/messages/unread/count', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setMessageCount(data.count || 0);
        } else {
          // Don't log an error if endpoint is just not found (404)
          // This is expected if messaging isn't fully implemented
          if (response.status !== 404) {
            console.error('Error fetching unread message count:', response.status);
          }
          // Just leave the message count at 0
        }
      } catch (err) {
        // Silently handle errors for this non-critical feature
        console.log('Messaging service not available');
      }
    };

    fetchUnreadMessageCount();
  }, []);

  // Handle deleting a listing
  const handleDelete = async (type, id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/${type}s/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete item');
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

  return (
    <div className="dashboard-container">
      <h1>Dashboard</h1>
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Retry
          </button>
        </div>
      )}
      
      <div className="dashboard-welcome">
        <h2>Welcome to your dashboard!</h2>
        {isCompany && !isVerifiedCompany && (
          <div className="verification-notice">
            <p>Your company is not verified yet. Only verified companies can post job listings.</p>
            <Link to="/verification" className="button">Apply for Verification</Link>
          </div>
        )}
        {isCompany && isVerifiedCompany && (
          <div className="verified-company-notice">
            <p>Your company is verified! You can now post job listings.</p>
          </div>
        )}
      </div>
      
      {/* Company verification section - show only if not already a company */}
      {!isCompany && (
        <div className="company-section">
          <h3>Become a Company</h3>
          <p>Register as a company to post job listings and gain more visibility.</p>
          <Link to="/company-registration" className="company-register-btn">Apply for Company Verification</Link>
        </div>
      )}
      
      {/* Show verification status if they're a company but not verified */}
      {isCompany && !isVerifiedCompany && (
        <div className="verification-section">
          <h3>Company Verification Status</h3>
          <p>Your company verification is pending. Only verified companies can post job listings.</p>
          <Link to="/verification-status" className="status-btn">Check Verification Status</Link>
        </div>
      )}
      
      {/* Show verified status if they're verified */}
      {isCompany && isVerifiedCompany && (
        <div className="verified-company-section">
          <h3>Verified Company</h3>
          <p>Your company is verified! You can now post job listings.</p>
          <Link to="/new-ad?type=job" className="post-job-btn">Post a Job</Link>
        </div>
      )}
      
      <div className="create-listing-section">
        <h3>Create New Listing</h3>
        <div className="listing-type-buttons">
          {isVerifiedCompany ? (
            <Link to="/new-ad?type=job" className="listing-btn job">Post a Job</Link>
          ) : isCompany ? (
            <div className="listing-btn job disabled" title="Only verified companies can post jobs">
              Post a Job
              <span className="tooltip">Verification required</span>
            </div>
          ) : null}
          <Link to="/new-ad?type=house" className="listing-btn house">Post a House</Link>
          <Link to="/new-ad?type=car" className="listing-btn car">Post a Car</Link>
          <Link to="/new-ad?type=item" className="listing-btn item">Post an Item</Link>
        </div>
      </div>
      
      <div className="my-listings-section">
        <h3>My Listings</h3>
        
        {loading ? (
          <div className="loading-container">
            <LoadingSpinner size="medium" text="Loading your listings..." />
          </div>
        ) : (
          <div className="listings-container">
            {isCompany && (
              <div className="listing-category">
                <h4>Jobs ({userListings.jobs.length})</h4>
                {userListings.jobs.length === 0 ? (
                  <p>You have no job listings.</p>
                ) : (
                  <div className="listing-cards">
                    {userListings.jobs.map(job => (
                      <div key={job.id} className="listing-card">
                        <h5>{job.title}</h5>
                        <p className="listing-location">{job.location}</p>
                        <p className="listing-salary">${job.salary}</p>
                        <div className="listing-actions">
                          <Link to={`/edit-job/${job.id}`} className="edit-btn">Edit</Link>
                          <button 
                            onClick={() => handleDelete('job', job.id)} 
                            className="delete-btn"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <div className="listing-category">
              <h4>Houses ({userListings.houses.length})</h4>
              {userListings.houses.length === 0 ? (
                <p>You have no house listings.</p>
              ) : (
                <div className="listing-cards">
                  {userListings.houses.map(house => (
                    <div key={house.id} className="listing-card">
                      <h5>{house.title}</h5>
                      <p className="listing-location">{house.location}</p>
                      <p className="listing-price">${house.price}</p>
                      <div className="listing-actions">
                        <Link to={`/edit-house/${house.id}`} className="edit-btn">Edit</Link>
                        <button 
                          onClick={() => handleDelete('house', house.id)} 
                          className="delete-btn"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="listing-category">
              <h4>Cars ({userListings.cars.length})</h4>
              {userListings.cars.length === 0 ? (
                <p>You have no car listings.</p>
              ) : (
                <div className="listing-cards">
                  {userListings.cars.map(car => (
                    <div key={car.id} className="listing-card">
                      <h5>{car.title}</h5>
                      <p className="listing-make">{car.make} {car.model}</p>
                      <p className="listing-price">${car.price}</p>
                      <div className="listing-actions">
                        <Link to={`/edit-car/${car.id}`} className="edit-btn">Edit</Link>
                        <button 
                          onClick={() => handleDelete('car', car.id)} 
                          className="delete-btn"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="listing-category">
              <h4>Items ({userListings.items.length})</h4>
              {userListings.items.length === 0 ? (
                <p>You have no item listings.</p>
              ) : (
                <div className="listing-cards">
                  {userListings.items.map(item => (
                    <div key={item.id} className="listing-card">
                      <h5>{item.title}</h5>
                      <p className="listing-category">{item.category}</p>
                      <p className="listing-price">${item.price}</p>
                      <div className="listing-actions">
                        <Link to={`/edit-item/${item.id}`} className="edit-btn">Edit</Link>
                        <button 
                          onClick={() => handleDelete('item', item.id)} 
                          className="delete-btn"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Admin section - only show if user is admin */}
      {userRole === 'admin' && (
        <div className="admin-section">
          <h3>Admin Controls</h3>
          <div className="admin-links">
            <Link to="/admin" className="admin-link">Admin Dashboard</Link>
            <Link to="/admin/users" className="admin-link">User Management</Link>
            <Link to="/admin/verifications" className="admin-link">Verification Requests</Link>
            <Link to="/admin/listings" className="admin-link">Listing Management</Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;