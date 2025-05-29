import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminStyles.css';

const VerificationRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [action, setAction] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  // Add state for action feedback
  const [actionStatus, setActionStatus] = useState({});
  
  // Add state for detailed view
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'
  
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
        
        // User is admin, fetch verification requests
        fetchVerificationRequests();
      } catch (err) {
        console.error('Auth check error:', err);
        navigate('/login', { replace: true });
      }
    };
    
    checkAdmin();
  }, [navigate]);
  
  const fetchVerificationRequests = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/verification-requests', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch verification requests');
      }
      
      const data = await response.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Error fetching verification requests:', err);
      setError('Could not load verification requests');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (request, requestedAction) => {
    setCurrentRequest(request);
    setAction(requestedAction);
    setModalOpen(true);
    if (requestedAction === 'approve') {
      setRejectionReason('');
    }
  };
  
  const handleCloseModal = () => {
    setModalOpen(false);
    setCurrentRequest(null);
    setAction('');
    setRejectionReason('');
  };
  
  const handleVerificationAction = async (requestToProcess, actionToPerform, reason = '') => {
    if (!requestToProcess || !actionToPerform) return;
    
    try {
      // Set status to pending for this request
      setActionStatus(prev => ({
        ...prev,
        [requestToProcess.id]: { status: 'pending', action: actionToPerform }
      }));
      
      const response = await fetch('/api/admin/verification-requests/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          requestId: requestToProcess.id,
          action: actionToPerform,
          rejectionReason: actionToPerform === 'reject' ? reason : undefined
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Error: ${response.status}`);
      }
      
      // Show success status
      setActionStatus(prev => ({
        ...prev,
        [requestToProcess.id]: { status: 'success', action: actionToPerform }
      }));
      
      // Update the request status in the UI without a full reload
      setRequests(requests.map(req => 
        req.id === requestToProcess.id 
          ? { ...req, status: actionToPerform === 'approve' ? 'approved' : 'rejected' } 
          : req
      ));
      
      // Close the modal after a short delay if it was open for this action
      // (specifically for rejections, approvals might not open a modal)
      if (modalOpen && currentRequest && currentRequest.id === requestToProcess.id) {
        setTimeout(() => {
          handleCloseModal();
          // Clear the status after some time
          setTimeout(() => {
            setActionStatus(prev => {
              const newStatus = {...prev};
              delete newStatus[requestToProcess.id]; // Use requestToProcess.id
              return newStatus;
            });
          }, 3000);
        }, 1000);
      } else {
         // For actions not involving a modal (like direct approve), clear status sooner
        setTimeout(() => {
          setActionStatus(prev => {
            const newStatus = {...prev};
            delete newStatus[requestToProcess.id];
            return newStatus;
          });
        }, 3000); // Or a suitable delay
      }
      
    } catch (err) {
      console.error('Error processing verification request:', err);
      
      // Show error status
      setActionStatus(prev => ({
        ...prev,
        [requestToProcess.id]: { status: 'error', action: actionToPerform, message: err.message }
      }));
      
      // Clear error status after delay
      setTimeout(() => {
        setActionStatus(prev => {
          const newStatus = {...prev};
          delete newStatus[requestToProcess.id];
          return newStatus;
        });
      }, 5000);
    }
  };
  
  // Function to view request details
  const viewRequestDetails = (request) => {
    setSelectedRequest(request);
    setViewMode('detail');
  };

  // Function to go back to list view
  const backToList = () => {
    setViewMode('list');
    setSelectedRequest(null);
  };

  if (loading) {
    return (
      <div className="admin-container">
        <h1>Verification Requests</h1>
        <div className="loading-spinner"></div>
        <p>Loading verification requests...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-container">
        <h1>Verification Requests</h1>
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchVerificationRequests} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render the detailed view of a verification request
  const renderDetailView = () => {
    if (!selectedRequest) return null;

    return (
      <div className="request-detail-container">
        <div className="detail-header">
          <button onClick={backToList} className="back-button">
            &larr; Back to All Requests
          </button>
          <h2>Verification Request Details</h2>
          <span className={`status-badge ${selectedRequest.status}`}>
            {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
          </span>
        </div>
        
        <div className="detail-content">
          <div className="detail-section">
            <h3>Company Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="label">Company Name:</span>
                <span className="value">{selectedRequest.company_name}</span>
              </div>
              
              <div className="detail-item">
                <span className="label">Submitted By:</span>
                <span className="value">{selectedRequest.username}</span>
              </div>
              
              <div className="detail-item">
                <span className="label">Submitted On:</span>
                <span className="value">{new Date(selectedRequest.created_at).toLocaleString()}</span>
              </div>
              
              <div className="detail-item">
                <span className="label">Business License:</span>
                <span className="value">{selectedRequest.business_license_number}</span>
              </div>
              
              <div className="detail-item">
                <span className="label">Contact Email:</span>
                <span className="value">{selectedRequest.contact_email}</span>
              </div>
              
              <div className="detail-item">
                <span className="label">Contact Phone:</span>
                <span className="value">{selectedRequest.contact_phone || 'N/A'}</span>
              </div>
            </div>
          </div>
          
          <div className="detail-section">
            <h3>Company Description</h3>
            <div className="company-description">
              {selectedRequest.company_description || 'No description provided.'}
            </div>
          </div>
          
          {selectedRequest.logo_url && (
            <div className="detail-section">
              <h3>Company Logo</h3>
              <div className="company-logo">
                <img src={selectedRequest.logo_url} alt={`${selectedRequest.company_name} logo`} />
              </div>
            </div>
          )}
          
          {selectedRequest.status === 'pending' && (
            <div className="verification-actions">
              <button 
                onClick={() => handleVerificationAction(selectedRequest, 'approve')}
                className="approve-button"
              >
                Approve Request
              </button>
              <button 
                onClick={() => handleOpenModal(selectedRequest, 'reject')}
                className="reject-button"
              >
                Reject Request
              </button>
            </div>
          )}
          
          {selectedRequest.status === 'rejected' && selectedRequest.rejection_reason && (
            <div className="detail-section">
              <h3>Rejection Reason</h3>
              <div className="rejection-reason">
                {selectedRequest.rejection_reason}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render the list view of verification requests
  const renderListView = () => {
    return (
      <>
        <h1>Company Verification Requests</h1>
        
        {requests.length === 0 ? (
          <div className="no-requests">
            <p>There are no pending verification requests.</p>
          </div>
        ) : (
          <div className="requests-list">
            <div className="admin-toolbar">
              <div className="filter-options">
                <select 
                  onChange={(e) => {
                    // Add filter functionality
                    console.log(e.target.value);
                    // Implement filtering logic
                  }}
                >
                  <option value="all">All Requests</option>
                  <option value="pending">Pending Only</option>
                  <option value="approved">Approved Only</option>
                  <option value="rejected">Rejected Only</option>
                </select>
              </div>
              
              <button 
                onClick={fetchVerificationRequests}
                className="refresh-button"
              >
                Refresh
              </button>
            </div>
            
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>Submitted By</th>
                  <th>Submitted On</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(request => (
                  <tr key={request.id} className={request.status}>
                    <td>{request.company_name}</td>
                    <td>{request.username}</td>
                    <td>{new Date(request.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-badge ${request.status}`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          onClick={() => viewRequestDetails(request)}
                          className="view-button"
                        >
                          View Details
                        </button>
                        
                        {request.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => handleVerificationAction(request, 'approve')}
                              className="approve-button"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleOpenModal(request, 'reject')}
                              className="reject-button"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="admin-container">
      {viewMode === 'list' ? renderListView() : renderDetailView()}
      
      {/* Rejection Modal - Keep existing code */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>
              {currentRequest && currentRequest.status === 'pending' 
                ? 'Reject Verification Request' 
                : 'Verification Request Details'}
            </h2>
            
            <div className="request-details">
              <div className="detail-row">
                <strong>Company:</strong> {currentRequest?.company_name}
              </div>
              <div className="detail-row">
                <strong>Description:</strong> {currentRequest?.company_description}
              </div>
              <div className="detail-row">
                <strong>License #:</strong> {currentRequest?.business_license_number}
              </div>
              <div className="detail-row">
                <strong>Contact Email:</strong> {currentRequest?.contact_email}
              </div>
              <div className="detail-row">
                <strong>Contact Phone:</strong> {currentRequest?.contact_phone || 'N/A'}
              </div>
            </div>
            
            {currentRequest && currentRequest.status === 'pending' && (
              <div className="rejection-form">
                <label htmlFor="rejectionReason">Reason for Rejection:</label>
                <textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  placeholder="Explain why this request is being rejected..."
                  required
                ></textarea>
                
                <div className="modal-actions">
                  <button 
                    className="cancel-button"
                    onClick={handleCloseModal}
                  >
                    Cancel
                  </button>
                  <button 
                    className="confirm-reject-button"
                    disabled={!rejectionReason.trim()}
                    onClick={() => handleVerificationAction(currentRequest, action, rejectionReason)}
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            )}
            
            {currentRequest && currentRequest.status !== 'pending' && (
              <div className="modal-actions">
                <button 
                  className="close-button"
                  onClick={handleCloseModal}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationRequests;
