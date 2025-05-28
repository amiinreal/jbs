import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getImageUrl, getPlaceholderImage } from '../../utils/fileUtils';
import './ListingStyles.css';

const JobListings = () => {
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        
        const response = await fetch('/api/jobs/public');
        
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }
        
        const data = await response.json();
        const jobsData = data.data || [];
        setJobs(jobsData);
        
        // Get unique company IDs
        const companyIds = [...new Set(jobsData.map(job => job.user_id))];
        
        // Fetch company info for each company ID
        const companyData = {};
        
        await Promise.all(companyIds.map(async (companyId) => {
          try {
            const companyResponse = await fetch(`/api/users/${companyId}/public`);
            
            if (companyResponse.ok) {
              const companyInfo = await companyResponse.json();
              if (companyInfo.success && companyInfo.data) {
                companyData[companyId] = companyInfo.data;
              }
            }
          } catch (err) {
            console.error(`Error fetching company ${companyId}:`, err);
          }
        }));
        
        setCompanies(companyData);
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError('Failed to load job listings. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchJobs();
  }, []);

  if (loading) {
    return (
      <div className="listings-container">
        <h1>Job Listings</h1>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading job listings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="listings-container">
        <h1>Job Listings</h1>
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="listings-container">
      <h1>Job Listings</h1>
      
      {jobs.length === 0 ? (
        <div className="no-listings">
          <p>No job listings found.</p>
        </div>
      ) : (
        <div className="job-listings-grid">
          {jobs.map(job => {
            const company = companies[job.user_id] || {};
            const logoUrl = getImageUrl(company) || getPlaceholderImage('user');
            
            return (
              <Link to={`/jobs/${job.id}`} key={job.id} className="job-card">
                <div className="company-logo">
                  <img src={logoUrl} alt={company.company_name || 'Company'} />
                </div>
                
                <div className="job-details">
                  <h2 className="job-title">{job.title}</h2>
                  <h3 className="company-name">{company.company_name || 'Company'}</h3>
                  
                  <div className="job-meta">
                    <span className="job-location">
                      <i className="meta-icon">📍</i> {job.location || 'Remote'}
                    </span>
                    <span className="job-type">
                      <i className="meta-icon">⏱️</i> {job.type || 'Full-time'}
                    </span>
                    <span className="job-salary">
                      <i className="meta-icon">💰</i> ${job.salary?.toLocaleString() || 'Competitive'}
                    </span>
                  </div>
                  
                  <p className="job-description">
                    {job.description?.substring(0, 150)}
                    {job.description?.length > 150 ? '...' : ''}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default JobListings;
