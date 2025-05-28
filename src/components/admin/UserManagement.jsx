import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminStyles.css';

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeUser, setActiveUser] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'edit', 'delete', 'role'
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [userData, setUserData] = useState({
    username: '',
    email: '',
    role_id: 1,
    is_company: false,
    is_verified_company: false,
    company_name: '',
    company_description: ''
  });
  
  const roles = {
    1: 'user',
    2: 'admin'
  };

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
        
        // Load users
        fetchUsers();
      } catch (err) {
        console.error('Auth check error:', err);
        navigate('/login', { replace: true });
      }
    };
    
    checkAdmin();
  }, [navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (action) => {
    try {
      if (!activeUser) return;
      
      let url, method, body;
      
      switch (action) {
        case 'edit':
          url = `/api/admin/users/${activeUser.id}`;
          method = 'PUT';
          body = JSON.stringify(userData);
          break;
        case 'delete':
          url = `/api/admin/users/${activeUser.id}`;
          method = 'DELETE';
          body = null;
          break;
        case 'changeRole':
          url = `/api/admin/users/${activeUser.id}/role`;
          method = 'POST';
          body = JSON.stringify({ role_id: userData.role_id });
          break;
        case 'verifyCompany':
          url = `/api/admin/users/${activeUser.id}/verify`;
          method = 'POST';
          body = JSON.stringify({ is_verified: true });
          break;
        case 'unverifyCompany':
          url = `/api/admin/users/${activeUser.id}/verify`;
          method = 'POST';
          body = JSON.stringify({ is_verified: false });
          break;
        default:
          return;
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Action failed');
      }
      
      // Refresh user list
      fetchUsers();
      
      // Reset modal
      setActiveUser(null);
      setModalMode(null);
    } catch (err) {
      console.error(`Error performing ${action}:`, err);
      setError(err.message || `Failed to ${action}`);
    }
  };

  const openUserModal = (user, mode) => {
    setActiveUser(user);
    setModalMode(mode);
    
    if (mode === 'edit') {
      setUserData({
        username: user.username,
        email: user.email,
        role_id: user.role_id,
        is_company: user.is_company,
        is_verified_company: user.is_verified_company,
        company_name: user.company_name || '',
        company_description: user.company_description || ''
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setUserData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Filter users based on search and role filter
  const filteredUsers = users.filter(user => {
    const matchesSearch = (
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.company_name && user.company_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    
    const matchesRole = roleFilter === 'all' || 
                        (roleFilter === 'admin' && user.role_id === 2) ||
                        (roleFilter === 'user' && user.role_id === 1) ||
                        (roleFilter === 'company' && user.is_company) ||
                        (roleFilter === 'verified' && user.is_verified_company);
    
    return matchesSearch && matchesRole;
  });

  if (loading && users.length === 0) {
    return (
      <div className="admin-container">
        <h1>User Management</h1>
        <div className="loading-spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <h1>User Management</h1>
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="dismiss-button">
            Dismiss
          </button>
        </div>
      )}
      
      <div className="admin-toolbar">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="filter-options">
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Users</option>
            <option value="admin">Admins</option>
            <option value="user">Regular Users</option>
            <option value="company">Companies</option>
            <option value="verified">Verified Companies</option>
          </select>
        </div>
        
        <button 
          onClick={() => fetchUsers()}
          className="refresh-button"
        >
          Refresh
        </button>
      </div>
      
      <div className="users-list">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Company Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="5" className="no-results">No users found</td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge ${roles[user.role_id]}`}>
                      {roles[user.role_id]}
                    </span>
                  </td>
                  <td>
                    {user.is_company ? (
                      <span className={`company-badge ${user.is_verified_company ? 'verified' : 'unverified'}`}>
                        {user.is_verified_company ? 'Verified Company' : 'Unverified Company'}
                      </span>
                    ) : (
                      <span className="company-badge none">Not a Company</span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        onClick={() => openUserModal(user, 'edit')}
                        className="edit-button"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => openUserModal(user, 'role')}
                        className="role-button"
                      >
                        Change Role
                      </button>
                      {user.is_company && (
                        <button 
                          onClick={() => openUserModal(user, user.is_verified_company ? 'unverify' : 'verify')}
                          className={user.is_verified_company ? 'unverify-button' : 'verify-button'}
                        >
                          {user.is_verified_company ? 'Remove Verification' : 'Verify Company'}
                        </button>
                      )}
                      <button 
                        onClick={() => openUserModal(user, 'delete')}
                        className="delete-button"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Edit User Modal */}
      {activeUser && modalMode === 'edit' && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Edit User</h2>
            
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={userData.username}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={userData.email}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="is_company">Company Account</label>
              <input
                type="checkbox"
                id="is_company"
                name="is_company"
                checked={userData.is_company}
                onChange={handleInputChange}
              />
            </div>
            
            {userData.is_company && (
              <>
                <div className="form-group">
                  <label htmlFor="is_verified_company">Verified Company</label>
                  <input
                    type="checkbox"
                    id="is_verified_company"
                    name="is_verified_company"
                    checked={userData.is_verified_company}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="company_name">Company Name</label>
                  <input
                    type="text"
                    id="company_name"
                    name="company_name"
                    value={userData.company_name}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="company_description">Company Description</label>
                  <textarea
                    id="company_description"
                    name="company_description"
                    value={userData.company_description}
                    onChange={handleInputChange}
                    rows="3"
                  ></textarea>
                </div>
              </>
            )}
            
            <div className="modal-actions">
              <button 
                className="cancel-button"
                onClick={() => {
                  setActiveUser(null);
                  setModalMode(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="save-button"
                onClick={() => handleUserAction('edit')}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Change Role Modal */}
      {activeUser && modalMode === 'role' && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Change User Role</h2>
            
            <div className="current-role">
              <p>Current role: <strong>{roles[activeUser.role_id]}</strong></p>
            </div>
            
            <div className="form-group">
              <label htmlFor="role_id">Select New Role</label>
              <select
                id="role_id"
                name="role_id"
                value={userData.role_id}
                onChange={handleInputChange}
              >
                <option value="1">Regular User</option>
                <option value="2">Admin</option>
              </select>
            </div>
            
            <div className="role-warning">
              <p>
                <strong>Warning:</strong> Changing user roles can grant or revoke significant permissions.
                {userData.role_id === 2 && ' Making this user an admin will give them full access to all administrative functions.'}
              </p>
            </div>
            
            <div className="modal-actions">
              <button 
                className="cancel-button"
                onClick={() => {
                  setActiveUser(null);
                  setModalMode(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="save-button"
                onClick={() => handleUserAction('changeRole')}
              >
                Change Role
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Verify/Unverify Company Modal */}
      {activeUser && (modalMode === 'verify' || modalMode === 'unverify') && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>
              {modalMode === 'verify' ? 'Verify Company' : 'Remove Company Verification'}
            </h2>
            
            <div className="company-info">
              <p><strong>Company:</strong> {activeUser.company_name || 'N/A'}</p>
              <p><strong>Description:</strong> {activeUser.company_description || 'N/A'}</p>
            </div>
            
            <div className="verification-warning">
              <p>
                {modalMode === 'verify' 
                  ? 'Verifying this company will allow them to post job listings and display a verified badge.' 
                  : 'Removing verification will prevent this company from posting job listings and remove their verified badge.'}
              </p>
            </div>
            
            <div className="modal-actions">
              <button 
                className="cancel-button"
                onClick={() => {
                  setActiveUser(null);
                  setModalMode(null);
                }}
              >
                Cancel
              </button>
              <button 
                className={modalMode === 'verify' ? 'verify-button' : 'unverify-button'}
                onClick={() => handleUserAction(modalMode === 'verify' ? 'verifyCompany' : 'unverifyCompany')}
              >
                {modalMode === 'verify' ? 'Verify Company' : 'Remove Verification'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete User Modal */}
      {activeUser && modalMode === 'delete' && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Delete User</h2>
            
            <div className="delete-warning">
              <p>
                <strong>Warning:</strong> This action cannot be undone. All of this user's 
                listings and data will be permanently deleted.
              </p>
              <p>
                Are you sure you want to delete the user <strong>{activeUser.username}</strong>?
              </p>
            </div>
            
            <div className="modal-actions">
              <button 
                className="cancel-button"
                onClick={() => {
                  setActiveUser(null);
                  setModalMode(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="delete-button"
                onClick={() => handleUserAction('delete')}
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
