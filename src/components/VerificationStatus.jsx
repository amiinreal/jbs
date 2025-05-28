import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './VerificationStatus.css';

const VerificationStatus = () => {
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchVerificationStatus = async () => {
      try {
        const response = await fetch('/api/company/verification-status', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch verification status');
        }
        
        const data = await response.json();
        setVerificationStatus(data);
      } catch (err) {
        console.error('Error fetching verification status:', err);
        setError('Could not retrieve your verification status. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVerificationStatus();
  }, []);

  if (loading) {
    return (
      <div className="verification-status-container">
        <div className="loading-spinner"></div>
        <p>Loading verification status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="verification-status-container">
        <div className="error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!verificationStatus || !verificationStatus.requested) {
    return (
      <div className="verification-status-container">
        <div className="not-requested">
          <h2>No Verification Request Found</h2>
          <p>You haven't submitted a company verification request yet.</p>
          <Link to="/company-registration" className="action-button">
            Register as Company
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="verification-status-container">
      <h1>Company Verification Status</h1>
      
      <div className={`status-card ${verificationStatus.status}`}>
        <div className="status-header">
          <h2>{verificationStatus.companyName}</h2>
          <div className={`status-badge ${verificationStatus.status}`}>
            {verificationStatus.status === 'approved' ? 'Verified' : 
             verificationStatus.status === 'pending' ? 'Pending' : 'Rejected'}
          </div>
        </div>
        
        <div className="status-details">
          <div className="detail-item">
            <span className="label">Submitted On:</span>
            <span className="value">{new Date(verificationStatus.submittedAt).toLocaleDateString()}</span>
          </div>
          
          {verificationStatus.reviewedAt && (
            <div className="detail-item">
              <span className="label">Reviewed On:</span>
              <span className="value">{new Date(verificationStatus.reviewedAt).toLocaleDateString()}</span>
            </div>
          )}
          
          {verificationStatus.status === 'approved' && (
            <div className="approved-message">
              <p>Your company has been verified! You can now post job listings.</p>
              <Link to="/add-job" className="action-button">
                Post a Job
              </Link>
            </div>
          )}
          
          {verificationStatus.status === 'pending' && (
            <div className="pending-message">
              <p>Your verification request is being reviewed. This usually takes 1-2 business days.</p>
            </div>
          )}
          
          {verificationStatus.status === 'rejected' && (
            <div className="rejected-message">
              <p>Unfortunately, your verification request was rejected.</p>
              {verificationStatus.rejectionReason && (
                <div className="rejection-reason">
                  <h3>Reason:</h3>
                  <p>{verificationStatus.rejectionReason}</p>
                </div>
              )}
              <Link to="/company-registration" className="action-button">
                Submit New Request
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerificationStatus;
