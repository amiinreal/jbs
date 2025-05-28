import React, { useState, useEffect } from 'react';
// Replace axios with fetch API (or we can install axios in step 2)
import api from '../config/api';

const AdminVerificationRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchVerificationRequests();
  }, []);

  const fetchVerificationRequests = async () => {
    try {
      setLoading(true);
      
      // Using fetch instead of axios
      const response = await fetch('/api/admin/company-verification-requests', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setRequests(data.requests || []);
    } catch (err) {
      setError('Failed to fetch verification requests');
      console.error('Error fetching verification requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId, status) => {
    try {
      setMessage('');
      
      // Using fetch instead of axios
      const response = await fetch(`/api/company-verification/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }
      
      const data = await response.json();
      setMessage(data.message);
      
      // Update the local state to reflect the change
      setRequests(requests.map(req => 
        req.id === requestId ? { ...req, status } : req
      ));
    } catch (err) {
      setError(err.message || 'Failed to update request status');
      console.error('Error updating status:', err);
    }
  };

  if (loading) return <div>Loading verification requests...</div>;

  return (
    <div className="admin-verification-container">
      <h2>Company Verification Requests</h2>
      
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      {requests.length === 0 ? (
        <p>No pending verification requests.</p>
      ) : (
        <div className="requests-list">
          {requests.map(request => (
            <div key={request.id} className="request-card">
              <div className="request-header">
                <h3>{request.company_name}</h3>
                <span className={`status-badge ${request.status}`}>{request.status}</span>
              </div>
              
              <div className="request-details">
                <p><strong>Description:</strong> {request.company_description || 'N/A'}</p>
                <p><strong>Business License:</strong> {request.business_license_number}</p>
                <p><strong>Contact Email:</strong> {request.contact_email}</p>
                <p><strong>Contact Phone:</strong> {request.contact_phone || 'N/A'}</p>
                <p><strong>Submitted:</strong> {new Date(request.created_at).toLocaleString()}</p>
              </div>

              {request.status === 'pending' && (
                <div className="request-actions">
                  <button 
                    className="approve-button"
                    onClick={() => handleStatusUpdate(request.id, 'approved')}
                  >
                    Approve
                  </button>
                  <button 
                    className="reject-button"
                    onClick={() => handleStatusUpdate(request.id, 'rejected')}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminVerificationRequests;