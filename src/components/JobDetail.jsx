import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getImageUrl, getPlaceholderImage } from '../utils/fileUtils';
import './JobDetail.css';

const JobDetail = ({ user, isAuthenticated }) => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  
  const [job, setJob] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applying, setApplying] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [applicationData, setApplicationData] = useState({
    coverLetter: '',
    resume: null,
    phone: '',
    availability: ''
  });

  useEffect(() => {
    const fetchJobData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch job details
        const jobResponse = await fetch(`/api/jobs/${jobId}`);
        
        if (!jobResponse.ok) {
          throw new Error(`Failed to fetch job information: ${jobResponse.status}`);
        }
        
        const jobData = await jobResponse.json();
        
        if (!jobData.success || !jobData.data) {
          throw new Error('No job data returned from server');
        }
        
        setJob(jobData.data);
        
        // Fetch company details if we have user_id
        if (jobData.data.user_id) {
          const companyResponse = await fetch(`/api/users/${jobData.data.user_id}/public`);
          
          if (companyResponse.ok) {
            const companyData = await companyResponse.json();
            if (companyData.success && companyData.data) {
              setCompany(companyData.data);
            }
          } else {
            console.warn('Failed to fetch company information:', companyResponse.status);
          }
        }
        
        // Check if user has already applied for this job (if authenticated)
        if (isAuthenticated && user) {
          try {
            const applicationCheckResponse = await fetch(`/api/jobs/${jobId}/applications/check`, {
              credentials: 'include'
            });
            
            if (applicationCheckResponse.ok) {
              const applicationCheckData = await applicationCheckResponse.json();
              if (applicationCheckData.hasApplied) {
                setApplicationStatus('applied');
              }
            }
          } catch (appCheckError) {
            console.warn('Failed to check application status:', appCheckError);
          }
        }
      } catch (err) {
        console.error('Error loading job details:', err);
        setError(err.message || 'Failed to load job details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchJobData();
  }, [jobId, isAuthenticated, user]);
  
  const handleApplyClick = () => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      // Store the current URL in session storage so we can redirect back after login
      sessionStorage.setItem('redirectAfterLogin', `/jobs/${jobId}`);
      navigate('/login');
      return;
    }
    
    // Show application form
    setApplying(true);
  };
  
  const handleApplicationSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const formData = new FormData();
      formData.append('coverLetter', applicationData.coverLetter);
      formData.append('phone', applicationData.phone);
      formData.append('availability', applicationData.availability);
      
      if (applicationData.resume) {
        formData.append('resume', applicationData.resume);
      }
      
      const response = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Application failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setApplying(false);
        setApplicationStatus('success');
      } else {
        throw new Error(data.error || 'Application failed');
      }
    } catch (err) {
      console.error('Error applying for job:', err);
      setApplicationStatus('error');
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setApplicationData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleFileChange = (e) => {
    setApplicationData(prev => ({
      ...prev,
      resume: e.target.files[0]
    }));
  };

  if (loading) {
    return (
      <div className="job-detail-container loading">
        <div className="loading-spinner"></div>
        <p>Loading job details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="job-detail-container error">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => window.history.back()} className="back-button">
          Go Back
        </button>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="job-detail-container error">
        <h2>Job Not Found</h2>
        <p>The requested job listing could not be found.</p>
        <Link to="/jobs" className="back-button">
          Browse All Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="job-detail-container">
      {/* Back button */}
      <div className="job-detail-nav">
        <button onClick={() => window.history.back()} className="back-button">
          &larr; Back to Jobs
        </button>
      </div>
      
      {/* Job header */}
      <div className="job-detail-header" 
           style={job.banner_image_url ? { backgroundImage: `url(${job.banner_image_url})` } : {}}>
        <div className="job-header-content">
          <h1 className="job-title">{job.title}</h1>
          <div className="company-info">
            <div className="company-logo">
              <img 
                src={company?.logo_url ? getImageUrl(company.logo_url) : getPlaceholderImage('user')} 
                alt={company?.company_name || job.company || 'Company'} 
              />
            </div>
            <div className="company-details">
              <h2 className="company-name">{company?.company_name || job.company || 'Company'}</h2>
              <div className="job-meta">
                <span className="job-location">
                  <i className="meta-icon">📍</i> {job.location || 'Remote'}
                </span>
                <span className="job-type">
                  <i className="meta-icon">⏱️</i> {job.job_type || 'Full-time'}
                </span>
                {job.salary && (
                  <span className="job-salary">
                    <i className="meta-icon">💰</i> {job.salary}
                  </span>
                )}
                {job.experience_required && (
                  <span className="job-experience">
                    <i className="meta-icon">🔍</i> {job.experience_required} experience
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Application status message */}
      {applicationStatus === 'success' && (
        <div className="application-status success">
          <h3>Application Submitted!</h3>
          <p>Your application has been successfully submitted. The company will contact you if they're interested.</p>
        </div>
      )}
      
      {applicationStatus === 'error' && (
        <div className="application-status error">
          <h3>Application Failed</h3>
          <p>There was a problem submitting your application. Please try again later.</p>
        </div>
      )}
      
      {applicationStatus === 'applied' && (
        <div className="application-status applied">
          <h3>You've Already Applied</h3>
          <p>You have already submitted an application for this position.</p>
        </div>
      )}
      
      {/* Job content */}
      <div className="job-detail-content">
        <div className="job-main-content">
          {/* Job description */}
          <section className="job-description">
            <h3>Job Description</h3>
            <div className="description-content" 
                 dangerouslySetInnerHTML={{ __html: job.description }} />
          </section>
          
          {/* Application form */}
          {!applying && !applicationStatus && (
            <div className="application-cta">
              <button 
                onClick={handleApplyClick} 
                className="apply-button"
                disabled={applicationStatus === 'applied'}
              >
                Apply for this Job
              </button>
            </div>
          )}
          
          {applying && (
            <section className="application-form-section">
              <h3>Apply for this Position</h3>
              <form onSubmit={handleApplicationSubmit} className="application-form">
                <div className="form-group">
                  <label htmlFor="coverLetter">Cover Letter / Introduction</label>
                  <textarea 
                    id="coverLetter" 
                    name="coverLetter" 
                    value={applicationData.coverLetter}
                    onChange={handleInputChange}
                    required
                    placeholder="Introduce yourself and explain why you're a good fit for this role..."
                    rows={6}
                  ></textarea>
                </div>
                
                <div className="form-group">
                  <label htmlFor="resume">Resume / CV</label>
                  <input 
                    type="file" 
                    id="resume" 
                    name="resume" 
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx"
                  />
                  <small className="form-text">Upload your resume (PDF, DOC, or DOCX)</small>
                </div>
                
                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input 
                    type="tel" 
                    id="phone" 
                    name="phone" 
                    value={applicationData.phone}
                    onChange={handleInputChange}
                    placeholder="Your contact phone number"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="availability">Availability</label>
                  <input 
                    type="text" 
                    id="availability" 
                    name="availability" 
                    value={applicationData.availability}
                    onChange={handleInputChange}
                    placeholder="When can you start? Do you have any scheduling constraints?"
                  />
                </div>
                
                <div className="form-actions">
                  <button 
                    type="button"
                    onClick={() => setApplying(false)}
                    className="cancel-button"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="submit-button"
                  >
                    Submit Application
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="job-sidebar">
          <section className="job-details-section">
            <h3>Job Details</h3>
            <ul className="job-details-list">
              <li>
                <span className="detail-label">Job Type:</span>
                <span className="detail-value">{job.job_type || 'Full-time'}</span>
              </li>
              <li>
                <span className="detail-label">Location:</span>
                <span className="detail-value">{job.location || 'Not specified'}</span>
              </li>
              {job.salary && (
                <li>
                  <span className="detail-label">Salary:</span>
                  <span className="detail-value">{job.salary}</span>
                </li>
              )}
              {job.experience_required && (
                <li>
                  <span className="detail-label">Experience:</span>
                  <span className="detail-value">{job.experience_required}</span>
                </li>
              )}
              {job.created_at && (
                <li>
                  <span className="detail-label">Posted:</span>
                  <span className="detail-value">
                    {new Date(job.created_at).toLocaleDateString()}
                  </span>
                </li>
              )}
            </ul>
          </section>
          
          {company && (
            <section className="company-section">
              <h3>About the Company</h3>
              <div className="company-card">
                <div className="company-logo">
                  <img 
                    src={company.logo_url ? getImageUrl(company.logo_url) : getPlaceholderImage('user')} 
                    alt={company.company_name || 'Company'} 
                  />
                </div>
                <h4>{company.company_name}</h4>
                {company.company_description && (
                  <p className="company-description">{company.company_description}</p>
                )}
                {company.email && (
                  <p className="company-email">
                    <strong>Email:</strong> {company.email}
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
