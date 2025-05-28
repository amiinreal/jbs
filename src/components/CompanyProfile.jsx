import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './CompanyProfile.css';

const CompanyProfile = ({ user }) => {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState({
    companyName: user?.company_name || '',
    companyDescription: '',
    logoUrl: '',
    isVerified: user?.isVerifiedCompany || false,
    jobs: [],
    stats: {
      totalListings: 0,
      activeJobs: 0,
      views: 0,
      applications: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    companyDescription: ''
  });

  useEffect(() => {
    if (!user?.isCompany) {
      navigate('/company-registration');
      return;
    }
    
    fetchCompanyData();
  }, [user, navigate]);

  const fetchCompanyData = async () => {
    try {
      setLoading(true);
      
      // Fetch company profile data
      const profileResponse = await fetch('/api/company/profile', {
        credentials: 'include'
      });
      
      if (!profileResponse.ok) {
        throw new Error('Failed to fetch company profile');
      }
      
      const profileData = await profileResponse.json();
      
      // Fetch company job listings
      const jobsResponse = await fetch('/api/jobs/company', {
        credentials: 'include'
      });
      
      let jobs = [];
      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json();
        jobs = jobsData.data || [];
      }
      
      setProfileData({
        companyName: profileData.company_name || user.company_name || '',
        companyDescription: profileData.company_description || '',
        logoUrl: profileData.logo_url || '',
        isVerified: profileData.is_verified_company || user.isVerifiedCompany || false,
        jobs,
        stats: {
          totalListings: jobs.length,
          activeJobs: jobs.filter(job => job.is_published).length,
          views: profileData.profile_views || 0,
          applications: profileData.total_applications || 0
        }
      });
      
      setFormData({
        companyName: profileData.company_name || user.company_name || '',
        companyDescription: profileData.company_description || ''
      });
    } catch (err) {
      console.error('Error fetching company profile:', err);
      setError('Failed to load company profile. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form data to current profile data
    setFormData({
      companyName: profileData.companyName,
      companyDescription: profileData.companyDescription
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/company/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          company_name: formData.companyName,
          company_description: formData.companyDescription
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update company profile');
      }
      
      // Update the profile data with new values
      setProfileData(prev => ({
        ...prev,
        companyName: formData.companyName,
        companyDescription: formData.companyDescription
      }));
      
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating company profile:', err);
      setError('Failed to update company profile. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="company-profile-container">
        <div className="loading-spinner"></div>
        <p>Loading company profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="company-profile-container">
        <div className="error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchCompanyData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="company-profile-container">
      <div className="profile-header">
        <div className="profile-header-content">
          <div className="company-logo-container">
            {profileData.logoUrl ? (
              <img src={profileData.logoUrl} alt="Company Logo" className="company-logo" />
            ) : (
              <div className="company-logo-placeholder">
                {profileData.companyName.charAt(0)}
              </div>
            )}
          </div>
          
          <div className="company-info">
            <div className="company-name-section">
              <h1>{profileData.companyName}</h1>
              {profileData.isVerified && (
                <span className="verification-badge">Verified</span>
              )}
            </div>
            
            {!isEditing ? (
              <>
                <p className="company-description">{profileData.companyDescription || 'No company description added yet.'}</p>
                <button onClick={handleEdit} className="edit-button">
                  Edit Profile
                </button>
              </>
            ) : (
              <form onSubmit={handleSubmit} className="edit-form">
                <div className="form-group">
                  <label htmlFor="companyName">Company Name</label>
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
                  <label htmlFor="companyDescription">Company Description</label>
                  <textarea
                    id="companyDescription"
                    name="companyDescription"
                    value={formData.companyDescription}
                    onChange={handleChange}
                    rows={4}
                  />
                </div>
                
                <div className="form-actions">
                  <button type="button" onClick={handleCancel} className="cancel-button">
                    Cancel
                  </button>
                  <button type="submit" className="save-button">
                    Save Changes
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
        
        {!profileData.isVerified && (
          <div className="verification-alert">
            <p>
              <strong>Your company is not verified yet.</strong> Only verified companies can post job listings.
            </p>
            <Link to="/verification-status" className="verification-link">
              Check Verification Status
            </Link>
          </div>
        )}
      </div>
      
      <div className="profile-content">
        <div className="profile-stats">
          <div className="stat-card">
            <div className="stat-value">{profileData.stats.totalListings}</div>
            <div className="stat-label">Total Listings</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{profileData.stats.activeJobs}</div>
            <div className="stat-label">Active Jobs</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{profileData.stats.views}</div>
            <div className="stat-label">Profile Views</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{profileData.stats.applications}</div>
            <div className="stat-label">Applications</div>
          </div>
        </div>
        
        <div className="jobs-section">
          <div className="section-header">
            <h2>Your Job Listings</h2>
            {profileData.isVerified && (
              <Link to="/new-ad?type=job" className="add-job-button">
                Post a New Job
              </Link>
            )}
          </div>
          
          {profileData.jobs.length === 0 ? (
            <div className="empty-jobs">
              <p>You haven't posted any job listings yet.</p>
              {profileData.isVerified ? (
                <Link to="/new-ad?type=job" className="post-job-link">
                  Post your first job
                </Link>
              ) : (
                <Link to="/verification-status" className="verification-link">
                  Get verified to post jobs
                </Link>
              )}
            </div>
          ) : (
            <div className="jobs-list">
              {profileData.jobs.map(job => (
                <div key={job.id} className="job-card">
                  <div className="job-title">{job.title}</div>
                  <div className="job-meta">
                    <span className="job-location">{job.location}</span>
                    <span className="job-type">{job.type}</span>
                  </div>
                  <div className="job-status">
                    <span className={`status-badge ${job.is_published ? 'published' : 'draft'}`}>
                      {job.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <div className="job-actions">
                    <Link to={`/jobs/${job.id}`} className="view-button">
                      View
                    </Link>
                    <Link to={`/edit-job/${job.id}`} className="edit-button">
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyProfile;
