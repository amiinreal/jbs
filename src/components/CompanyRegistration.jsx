import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageUpload from './ImageUpload';
import './CompanyRegistration.css';

const CompanyRegistration = ({ user }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    companyName: user?.company_name || '',
    companyDescription: '',
    businessLicenseNumber: '',
    contactEmail: user?.email || '',
    contactPhone: '',
    logoId: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [userVerificationStatus, setUserVerificationStatus] = useState(null);

  // If user is already a company, redirect to company profile
  useEffect(() => {
    if (user?.isCompany) {
      navigate('/company-profile');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Check auth and get user's company verification status
    const checkAuthAndStatus = async () => {
      try {
        // Check auth first
        const authResponse = await fetch('/api/auth/check', {
          credentials: 'include'
        });
        
        if (!authResponse.ok) {
          navigate('/login', { state: { from: '/company-registration' } });
          return;
        }
        
        // Then check if the user already has a company or pending verification
        const statusResponse = await fetch('/api/company/verification-status', {
          credentials: 'include'
        });
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          
          // If user already has a pending or approved company verification
          if (statusData.requested) {
            setUserVerificationStatus(statusData);
            
            // If they're already verified or have a pending request, redirect to status page
            if (statusData.status === 'approved' || statusData.status === 'pending') {
              navigate('/verification-status');
            }
          }
        }
      } catch (err) {
        console.error('Auth or status check error:', err);
        setError('Failed to verify your current status. Please try again.');
      }
    };
    
    checkAuthAndStatus();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleLogoUploaded = (fileId) => {
    setFormData(prevData => ({
      ...prevData,
      logoId: fileId
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // First, get the logo URL if we have a logo ID
      let logoUrl = null;
      if (formData.logoId) {
        logoUrl = `/api/files/${formData.logoId}`;
      }
      
      const response = await fetch('/api/company/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Make sure to include credentials
        body: JSON.stringify({
          company_name: formData.companyName,
          company_description: formData.companyDescription,
          business_license_number: formData.businessLicenseNumber,
          contact_email: formData.contactEmail,
          contact_phone: formData.contactPhone,
          logo_url: logoUrl,
          logo_file_id: formData.logoId
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to register as company');
      }
      
      setSuccessMessage('Company registration successful! Your verification request has been submitted.');
      
      // Redirect to verification page after short delay
      setTimeout(() => {
        navigate('/verification-status');
      }, 3000);
      
    } catch (err) {
      console.error('Error during company registration:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // If user has a rejected verification, show special message
  if (userVerificationStatus && userVerificationStatus.status === 'rejected') {
    return (
      <div className="company-registration-container">
        <h1>Reapply for Company Verification</h1>
        
        <div className="previous-rejection">
          <h3>Your previous application was not approved</h3>
          {userVerificationStatus.rejectionReason && (
            <div className="rejection-reason">
              <p><strong>Reason:</strong> {userVerificationStatus.rejectionReason}</p>
            </div>
          )}
          <p>Please update your information and resubmit your application.</p>
        </div>
        
        {/* Regular form follows */}
        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}
        
        {successMessage && (
          <div className="success-message">
            <p>{successMessage}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="company-registration-form">
          <div className="form-group">
            <label htmlFor="companyName">Company Name *</label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="companyDescription">Company Description *</label>
            <textarea
              id="companyDescription"
              name="companyDescription"
              value={formData.companyDescription}
              onChange={handleChange}
              rows={4}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="businessLicenseNumber">Business License Number *</label>
            <input
              type="text"
              id="businessLicenseNumber"
              name="businessLicenseNumber"
              value={formData.businessLicenseNumber}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="contactEmail">Contact Email *</label>
            <input
              type="email"
              id="contactEmail"
              name="contactEmail"
              value={formData.contactEmail}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="contactPhone">Contact Phone</label>
            <input
              type="tel"
              id="contactPhone"
              name="contactPhone"
              value={formData.contactPhone}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label>Company Logo</label>
            <div className="logo-upload">
              <ImageUpload 
                onImageUploaded={handleLogoUploaded}
                entityType="company_logo"
                multiple={false}
                isPrimary={true}
              />
            </div>
          </div>
          
          <div className="verification-note">
            <p>
              <strong>Note:</strong> Your company registration will be reviewed by our team.
              You'll be notified once your company is verified. Only verified companies
              can post job listings.
            </p>
          </div>
          
          <div className="form-actions">
            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Register as Company'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="company-registration-container">
      <h1>Apply for Company Verification</h1>
      
      <div className="registration-intro">
        <p>
          As a verified company, you'll be able to post job listings and have a verified 
          badge displayed on your profile and listings, giving users more confidence in your 
          business.
        </p>
      </div>
      
      {successMessage && (
        <div className="success-message">
          <p>{successMessage}</p>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="company-registration-form">
        <div className="form-group">
          <label htmlFor="companyName">Company Name *</label>
          <input
            type="text"
            id="companyName"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="companyDescription">Company Description *</label>
          <textarea
            id="companyDescription"
            name="companyDescription"
            value={formData.companyDescription}
            onChange={handleChange}
            rows={4}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="businessLicenseNumber">Business License Number *</label>
          <input
            type="text"
            id="businessLicenseNumber"
            name="businessLicenseNumber"
            value={formData.businessLicenseNumber}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="contactEmail">Contact Email *</label>
          <input
            type="email"
            id="contactEmail"
            name="contactEmail"
            value={formData.contactEmail}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="contactPhone">Contact Phone</label>
          <input
            type="tel"
            id="contactPhone"
            name="contactPhone"
            value={formData.contactPhone}
            onChange={handleChange}
          />
        </div>
        
        <div className="form-group">
          <label>Company Logo</label>
          <div className="logo-upload">
            <ImageUpload 
              onImageUploaded={handleLogoUploaded}
                entityType="company_logo"
              multiple={false}
              isPrimary={true}
            />
          </div>
        </div>
        
        <div className="verification-note">
          <p>
            <strong>Note:</strong> Your company verification request will be reviewed by our team.
            You'll be notified once your company is verified. Only verified companies
            can post job listings.
          </p>
        </div>
        
        <div className="form-actions">
          <button
            type="submit"
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Verification Request'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanyRegistration;