import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './AdminStyles.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    users: 0,
    verificationRequests: { total: 0, pending: 0 },
    listings: { houses: 0, cars: 0, jobs: 0, items: 0 },
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Verify user is admin
    const checkAdmin = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Authentication error');
        }
        
        const data = await response.json();
        
        if (!data.isAuthenticated || data.role !== 'admin') {
          navigate('/login', { replace: true });
          return;
        }
        
        // Load admin dashboard data
        fetchAdminStats();
      } catch (err) {
        console.error('Auth check error:', err);
        navigate('/login', { replace: true });
      }
    };
    
    checkAdmin();
  }, [navigate]);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/stats', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch admin statistics');
      }
      
      const data = await response.json();
      
      // Ensure all expected properties exist with defaults
      const processedData = {
        users: data.users || 0,
        verificationRequests: data.verificationRequests || { total: 0, pending: 0 },
        listings: data.listings || { houses: 0, cars: 0, jobs: 0, items: 0 },
        recentActivity: data.recentActivity || []
      };
      
      setStats(processedData);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      setError('Failed to load admin dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Function to format timestamp safely
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      return new Date(timestamp).toLocaleString();
    } catch (err) {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard-container">
        <h1>Admin Dashboard</h1>
        <div className="loading-spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard-container">
        <h1>Admin Dashboard</h1>
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchAdminStats} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      <h1>Admin Dashboard</h1>
      
      <div className="stats-cards">
        <div className="stats-card">
          <div className="stats-icon users-icon">👥</div>
          <div className="stats-data">
            <span className="stats-number">{stats.users}</span>
            <span className="stats-label">Total Users</span>
          </div>
          <Link to="/admin/users" className="stats-link">Manage Users</Link>
        </div>
        
        <div className="stats-card">
          <div className="stats-icon verification-icon">✓</div>
          <div className="stats-data">
            <span className="stats-number">{stats.verificationRequests.pending}</span>
            <span className="stats-label">Pending Verifications</span>
          </div>
          <Link to="/admin/verifications" className="stats-link">Review Verifications</Link>
        </div>
        
        <div className="stats-card">
          <div className="stats-icon listings-icon">📋</div>
          <div className="stats-data">
            <span className="stats-number">{
              (stats.listings.houses || 0) + 
              (stats.listings.cars || 0) + 
              (stats.listings.jobs || 0) + 
              (stats.listings.items || 0)
            }</span>
            <span className="stats-label">Total Listings</span>
          </div>
          <Link to="/admin/listings" className="stats-link">Manage Listings</Link>
        </div>
      </div>
      
      <div className="admin-panels">
        <div className="admin-panel">
          <h2>Admin Controls</h2>
          <div className="admin-actions">
            <Link to="/admin/users" className="admin-action-btn">
              <div className="action-icon">👥</div>
              <div className="action-text">
                <span className="action-title">User Management</span>
                <span className="action-desc">Manage user accounts</span>
              </div>
            </Link>
            
            <Link to="/admin/online-users" className="admin-action-btn">
              <div className="action-icon">🟢</div>
              <div className="action-text">
                <span className="action-title">Online Users</span>
                <span className="action-desc">View users currently online</span>
              </div>
            </Link>
            
            <Link to="/admin/verifications" className="admin-action-btn">
              <div className="action-icon">✓</div>
              <div className="action-text">
                <span className="action-title">Verification Requests</span>
                <span className="action-desc">Review company verifications</span>
              </div>
            </Link>
            
            <Link to="/admin/listings" className="admin-action-btn">
              <div className="action-icon">📋</div>
              <div className="action-text">
                <span className="action-title">Listing Management</span>
                <span className="action-desc">Manage all listings</span>
              </div>
            </Link>
            
            <Link to="/admin/messages" className="admin-action-btn">
              <div className="action-icon">✉️</div>
              <div className="action-text">
                <span className="action-title">Message Center</span>
                <span className="action-desc">View all conversations</span>
              </div>
            </Link>
          </div>
        </div>
        
        <div className="admin-panel">
          <h2>Recent Activity</h2>
          <div className="activity-timeline">
            {Array.isArray(stats.recentActivity) && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon">{
                    activity.type === 'user_created' ? '👤' :
                    activity.type === 'house_listing' ? '🏠' :
                    activity.type === 'car_listing' ? '🚗' :
                    activity.type === 'job_listing' ? '💼' :
                    activity.type === 'item_listing' ? '📦' :
                    activity.type === 'verification_request' ? '✓' : '🔔'
                  }</div>
                  <div className="activity-details">
                    <div className="activity-text">{activity.description || 'Activity recorded'}</div>
                    <div className="activity-time">{formatTimestamp(activity.timestamp)}</div>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-activity">No recent activity to display</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
