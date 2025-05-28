import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminStyles.css';

const ListingManagement = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState({
    houses: [],
    cars: [],
    jobs: [],
    items: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTab, setCurrentTab] = useState('houses');
  const [searchQuery, setSearchQuery] = useState('');
  const [publishedFilter, setPublishedFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);

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
        
        // Load listings
        fetchListings();
      } catch (err) {
        console.error('Auth check error:', err);
        navigate('/login', { replace: true });
      }
    };
    
    checkAdmin();
  }, [navigate]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/listings', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch listings');
      }
      
      const data = await response.json();
      setListings(data.listings || {
        houses: [],
        cars: [],
        jobs: [],
        items: []
      });
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteListing = async (type, id) => {
    try {
      const response = await fetch(`/api/admin/listings/${type}/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete listing');
      }
      
      // Remove deleted listing from state
      setListings(prev => ({
        ...prev,
        [type + 's']: prev[type + 's'].filter(listing => listing.id !== id)
      }));
      
      setConfirmDelete(null);
    } catch (err) {
      console.error('Error deleting listing:', err);
      setError('Failed to delete listing');
    }
  };

  // Filter listings based on search and publish status
  const getFilteredListings = () => {
    if (!listings[currentTab]) return [];
    
    return listings[currentTab].filter(listing => {
      // Different properties to search based on listing type
      let searchFields = [];
      
      switch (currentTab) {
        case 'houses':
          searchFields = [listing.address];
          break;
        case 'cars':
          searchFields = [listing.make, listing.model, listing.color];
          break;
        case 'jobs':
          searchFields = [listing.title, listing.location, listing.type];
          break;
        case 'items':
          searchFields = [listing.name, listing.description];
          break;
        default:
          searchFields = [];
      }
      
      // Join fields and check if they include the search query
      const searchText = searchFields.filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = searchText.includes(searchQuery.toLowerCase());
      
      // Check published status
      const matchesPublishedFilter = publishedFilter === 'all' || 
        (publishedFilter === 'published' && listing.is_published) ||
        (publishedFilter === 'unpublished' && !listing.is_published);
      
      return matchesSearch && matchesPublishedFilter;
    });
  };

  const renderListingTable = () => {
    const filteredListings = getFilteredListings();
    
    if (filteredListings.length === 0) {
      return (
        <div className="no-listings">
          <p>No {currentTab} found matching your filters.</p>
        </div>
      );
    }
    
    // Common table headers and actions
    const renderActions = (listing) => (
      <div className="action-buttons">
        <button 
          onClick={() => window.open(`/${currentTab.slice(0, -1)}/${listing.id}`, '_blank')}
          className="view-button"
        >
          View
        </button>
        <button 
          onClick={() => navigate(`/edit-${currentTab.slice(0, -1)}-listing/${listing.id}`)}
          className="edit-button"
        >
          Edit
        </button>
        <button 
          onClick={() => setConfirmDelete({ type: currentTab.slice(0, -1), id: listing.id })}
          className="delete-button"
        >
          Delete
        </button>
      </div>
    );
    
    // Custom table based on listing type
    switch (currentTab) {
      case 'houses':
        return (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Address</th>
                <th>Price</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredListings.map(house => (
                <tr key={house.id}>
                  <td>{house.id}</td>
                  <td>{house.address}</td>
                  <td>${house.price?.toLocaleString() || 'N/A'}</td>
                  <td>{house.owner_username}</td>
                  <td>
                    <span className={`status-badge ${house.is_published ? 'approved' : 'pending'}`}>
                      {house.is_published ? 'Published' : 'Unpublished'}
                    </span>
                  </td>
                  <td>{renderActions(house)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
        
      case 'cars':
        return (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Car</th>
                <th>Year</th>
                <th>Price</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredListings.map(car => (
                <tr key={car.id}>
                  <td>{car.id}</td>
                  <td>{car.make} {car.model}</td>
                  <td>{car.year}</td>
                  <td>${car.price?.toLocaleString() || 'N/A'}</td>
                  <td>{car.owner_username}</td>
                  <td>
                    <span className={`status-badge ${car.is_published ? 'approved' : 'pending'}`}>
                      {car.is_published ? 'Published' : 'Unpublished'}
                    </span>
                  </td>
                  <td>{renderActions(car)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
        
      case 'jobs':
        return (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Location</th>
                <th>Type</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredListings.map(job => (
                <tr key={job.id}>
                  <td>{job.id}</td>
                  <td>{job.title}</td>
                  <td>{job.location}</td>
                  <td>{job.type}</td>
                  <td>{job.owner_username}</td>
                  <td>
                    <span className={`status-badge ${job.is_published ? 'approved' : 'pending'}`}>
                      {job.is_published ? 'Published' : 'Unpublished'}
                    </span>
                  </td>
                  <td>{renderActions(job)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
        
      case 'items':
        return (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Price</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredListings.map(item => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.name}</td>
                  <td>${item.price?.toLocaleString() || 'N/A'}</td>
                  <td>{item.owner_username}</td>
                  <td>
                    <span className={`status-badge ${item.is_published ? 'approved' : 'pending'}`}>
                      {item.is_published ? 'Published' : 'Unpublished'}
                    </span>
                  </td>
                  <td>{renderActions(item)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
        
      default:
        return <p>Select a listing type to view</p>;
    }
  };

  if (loading && !Object.values(listings).some(arr => arr.length > 0)) {
    return (
      <div className="admin-container">
        <h1>Listing Management</h1>
        <div className="loading-spinner"></div>
        <p>Loading listings...</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <h1>Listing Management</h1>
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="dismiss-button">
            Dismiss
          </button>
        </div>
      )}
      
      <div className="tab-navigation">
        <button 
          className={`tab-button ${currentTab === 'houses' ? 'active' : ''}`}
          onClick={() => setCurrentTab('houses')}
        >
          Houses ({listings.houses.length})
        </button>
        <button 
          className={`tab-button ${currentTab === 'cars' ? 'active' : ''}`}
          onClick={() => setCurrentTab('cars')}
        >
          Cars ({listings.cars.length})
        </button>
        <button 
          className={`tab-button ${currentTab === 'jobs' ? 'active' : ''}`}
          onClick={() => setCurrentTab('jobs')}
        >
          Jobs ({listings.jobs.length})
        </button>
        <button 
          className={`tab-button ${currentTab === 'items' ? 'active' : ''}`}
          onClick={() => setCurrentTab('items')}
        >
          Items ({listings.items.length})
        </button>
      </div>
      
      <div className="admin-toolbar">
        <div className="search-bar">
          <input
            type="text"
            placeholder={`Search ${currentTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="filter-options">
          <select 
            value={publishedFilter}
            onChange={(e) => setPublishedFilter(e.target.value)}
          >
            <option value="all">All Listings</option>
            <option value="published">Published Only</option>
            <option value="unpublished">Unpublished Only</option>
          </select>
        </div>
        
        <button 
          onClick={fetchListings}
          className="refresh-button"
        >
          Refresh
        </button>
      </div>
      
      <div className="listings-table-container">
        {renderListingTable()}
      </div>
      
      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Delete Listing</h2>
            
            <div className="delete-warning">
              <p>
                <strong>Warning:</strong> This action cannot be undone. The listing will be permanently deleted.
              </p>
              <p>
                Are you sure you want to delete this {confirmDelete.type} listing?
              </p>
            </div>
            
            <div className="modal-actions">
              <button 
                className="cancel-button"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button 
                className="delete-button"
                onClick={() => handleDeleteListing(confirmDelete.type, confirmDelete.id)}
              >
                Delete Listing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListingManagement;
