import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminStyles.css';

const OnlineUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    // Check if user is admin
    const checkAdmin = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Authentication failed');
        }
        
        const data = await response.json();
        
        if (!data.isAuthenticated || data.role !== 'admin') {
          navigate('/login', { replace: true });
          return;
        }
        
        // User is admin, fetch online users
        fetchOnlineUsers();
        
        // Set up refresh interval (every 30 seconds)
        const interval = setInterval(fetchOnlineUsers, 30000);
        setRefreshInterval(interval);
      } catch (err) {
        console.error('Auth check error:', err);
        navigate('/login', { replace: true });
      }
    };
    
    checkAdmin();
    
    // Clear interval on component unmount
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [navigate]);

  const fetchOnlineUsers = async () => {
    try {
      setLoading(prevLoading => users.length > 0 ? false : prevLoading); // Keep showing content if we have data
      
      const response = await fetch('/api/admin/online-users', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch online users: ${response.status}`);
      }
      
      const data = await response.json();
      setUsers(data.users || []);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching online users:', err);
      
      // Show a more specific error message based on status code
      if (err.message.includes('404')) {
        setError('Online users API endpoint not found. Please check server configuration.');
      } else {
        setError(`Could not load online users: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDateTime = (dateString) => {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Calculate time remaining for session
  const getTimeRemaining = (expiryDate) => {
    if (!expiryDate) return 'Unknown';
    
    try {
      const expiry = new Date(expiryDate);
      const now = new Date();
      const diff = expiry - now;
      
      if (diff <= 0) return 'Expired';
      
      // Convert to minutes
      const minutes = Math.floor(diff / 60000);
      if (minutes < 60) return `${minutes} min`;
      
      // Convert to hours and minutes
      const hours = Math.floor(minutes / 60);
      const remainingMins = minutes % 60;
      return `${hours}h ${remainingMins}m`;
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <div className="admin-container">
      <h1>Online Users</h1>
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchOnlineUsers} className="retry-button">
            Retry
          </button>
          {/* Add troubleshooting tips for common issues */}
          {error.includes('404') && (
            <div className="troubleshooting-tips">
              <p><strong>Troubleshooting:</strong></p>
              <ul>
                <li>Ensure the backend server is running</li>
                <li>Check that the route is correctly defined in backend/routes/admin.js</li>
                <li>Verify the route is properly mounted in server.js</li>
              </ul>
            </div>
          )}
        </div>
      )}
      
      <div className="admin-toolbar">
        <button 
          onClick={fetchOnlineUsers}
          className="refresh-button"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
        <div className="online-count">
          {users.length} users online
          {lastUpdated && (
            <span className="last-updated">
              Last updated: {formatDateTime(lastUpdated)}
            </span>
          )}
        </div>
      </div>
      
      {loading && users.length === 0 ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading online users...</p>
        </div>
      ) : (
        <div className="users-list">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Session Expires</th>
                <th>Time Remaining</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="no-results">
                    {loading ? 'Loading...' : error ? 'Error loading data' : 'No users currently online'}
                  </td>
                </tr>
              ) : (
                users.map((user, index) => (
                  <tr key={index}>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      {user.is_company ? (
                        <span className={`company-badge ${user.is_verified_company ? 'verified' : 'unverified'}`}>
                          {user.is_verified_company ? 'Verified Company' : 'Unverified Company'}
                        </span>
                      ) : (
                        <span className="company-badge none">Regular User</span>
                      )}
                    </td>
                    <td>{formatDateTime(user.session_expires)}</td>
                    <td>{getTimeRemaining(user.session_expires)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OnlineUsers;
