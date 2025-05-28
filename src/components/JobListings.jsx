import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getImageUrl, getPlaceholderImage } from '../utils/fileUtils';
import './ListingStyles.css'; // Assuming this CSS file exists or will be created

const roleOptions = ['Designer', 'Developer', 'Manager', 'Engineer', 'Specialist', 'Other'];
const locationOptions = ['Remote', 'San Francisco, CA', 'New York, NY', 'Chicago, IL', 'Austin, TX', 'Other']; // Consider if these should be dynamic
const experienceOptions = ['Entry Level', 'Junior', 'Mid-Level', 'Senior', 'Lead', 'Executive']; // These need to map to `job.experience_required`
const employmentTypeOptions = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship']; // These need to map to `job.job_type`

const JobListings = () => {
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    role: '',
    location: '',
    experience: '',
    employmentType: '', // This corresponds to job_type in the data
    salaryRange: [0, 200000], // Default salary range
    searchTerm: ''
  });
  const [sortBy, setSortBy] = useState('latest'); // Default sort option
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState({
    role: false,
    location: false,
    experience: false,
    employmentType: false,
  });
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);

        const response = await fetch('/api/jobs');

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }

        const data = await response.json();
        const jobsData = data.data || [];
        setJobs(jobsData);
        setFilteredJobs(jobsData); // Initialize filteredJobs with all fetched jobs

        // Get unique company IDs
        const companyIds = [...new Set(jobsData.map(job => job.user_id))];

        // Fetch company info for each company ID
        const companyData = {};

        await Promise.all(companyIds.map(async (companyId) => {
          try {
            // Ensure companyId is valid before fetching
            if (!companyId) {
              console.warn('Skipping fetch for undefined companyId');
              return;
            }
            const companyResponse = await fetch(`/api/users/${companyId}/public`);

            if (companyResponse.ok) {
              const companyInfo = await companyResponse.json();
              if (companyInfo.success && companyInfo.data) {
                companyData[companyId] = companyInfo.data;
              }
            } else {
              console.warn(`Failed to fetch company info for ID ${companyId}: ${companyResponse.status}`);
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

  // Apply filters whenever filter options or values change
  useEffect(() => {
    if (!jobs || jobs.length === 0) {
      // If there are no initial jobs, ensure filteredJobs is also empty
      // or appropriately handled, perhaps by returning early.
      // If filters are active, it might be correct for filteredJobs to be empty.
      // For now, let's set filteredJobs to an empty array if jobs is empty.
      setFilteredJobs([]);
      return;
    }
  
    try {
      let filtered = [...jobs];
      
      // Apply role filter (uses job.title, assuming role is part of title or a general keyword search on title)
      if (filterOptions.role) {
        filtered = filtered.filter(job => 
          job && job.title && job.title.toLowerCase().includes(filterOptions.role.toLowerCase())
        );
      }
      
      // Apply location filter
      if (filterOptions.location) {
        filtered = filtered.filter(job => 
          job && job.location && job.location.toLowerCase().includes(filterOptions.location.toLowerCase())
        );
      }
      
      // Apply experience filter
      if (filterOptions.experience) {
        filtered = filtered.filter(job => 
          job && job.experience_required && 
          job.experience_required.toLowerCase().includes(filterOptions.experience.toLowerCase())
        );
      }
      
      // Apply employment type filter (uses job.job_type)
      if (filterOptions.employmentType) {
        filtered = filtered.filter(job => 
          job && job.job_type && job.job_type.toLowerCase().includes(filterOptions.employmentType.toLowerCase())
        );
      }
      
      // Apply salary range filter
      filtered = filtered.filter(job => {
        if (!job || typeof job.salary === 'undefined' || job.salary === null) return true; // Keep jobs with no salary info if not filtering by salary specifically
        
        let salaryValue;
        if (typeof job.salary === 'string') {
          // Attempt to parse salary string, e.g., "$50k - $70k" or "50000"
          // This simplified parser just takes numbers. A more robust one might be needed for ranges.
          const match = job.salary.match(/[0-9\.]+/g); // extracts numbers
          if (match) {
              // Use the first number found for range comparison, or an average if multiple
              salaryValue = parseFloat(match[0]); 
          } else {
              return true; // Cannot parse, include by default
          }
        } else if (typeof job.salary === 'number') {
          salaryValue = job.salary;
        } else {
          return true; // Unknown salary type, include by default
        }

        if (isNaN(salaryValue)) return true; // Not a number after parsing

        return salaryValue >= filterOptions.salaryRange[0] && salaryValue <= filterOptions.salaryRange[1];
      });
      
      // Apply search term filter (title, description, location, company name)
      if (filterOptions.searchTerm) {
        const term = filterOptions.searchTerm.toLowerCase();
        filtered = filtered.filter(job => 
          (job && job.title && job.title.toLowerCase().includes(term)) ||
          (job && job.description && job.description.toLowerCase().includes(term)) ||
          (job && job.location && job.location.toLowerCase().includes(term)) ||
          (job && (job.company || job.company_name) && (job.company || job.company_name).toLowerCase().includes(term))
        );
      }
      
      // Apply sorting
      try {
        switch(sortBy) {
          case 'latest':
            filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
          case 'oldest':
            filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            break;
          case 'highest_salary':
            filtered.sort((a, b) => {
              const getSal = j => (typeof j.salary === 'string' ? parseFloat(j.salary.match(/[0-9\.]+/g)?.[0] || 0) : (typeof j.salary === 'number' ? j.salary : 0));
              return getSal(b) - getSal(a);
            });
            break;
          case 'lowest_salary':
            filtered.sort((a, b) => {
              const getSal = j => (typeof j.salary === 'string' ? parseFloat(j.salary.match(/[0-9\.]+/g)?.[0] || 0) : (typeof j.salary === 'number' ? j.salary : 0));
              return getSal(a) - getSal(b);
            });
            break;
          default:
            break;
        }
      } catch (sortError) {
        console.error('Error sorting jobs:', sortError);
      }
      
      setFilteredJobs(filtered);
    } catch (filterError) {
      console.error('Error filtering jobs:', filterError);
      setFilteredJobs(jobs); // Fallback to showing all jobs if filtering fails catastrophically
    }
  }, [jobs, filterOptions, sortBy]); // Removed filterValues for now as its UI is not re-added

  const toggleFilterMenu = (filterName) => {
    setFilterMenuOpen(prev => ({
      ...Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {}), // Close all other dropdowns
      [filterName]: !prev[filterName]
    }));
    setSortMenuOpen(false); // Also close sort menu
  };

  const handleFilterSelect = (filterName, value) => {
    setFilterOptions(prev => ({
      ...prev,
      [filterName]: value
    }));
    // No need to call toggleFilterMenu here, it's called by the dropdown option itself if needed,
    // or the main click-outside handler will close it.
    // Forcing close here:
    setFilterMenuOpen(prev => ({ ...prev, [filterName]: false }));
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setFilterMenuOpen(prev => Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {}));
        setSortMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []); // Empty dependency array means this runs once on mount and cleans up on unmount

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

      <div className="search-bar" ref={dropdownRef}> {/* Added dropdownRef here as it's a common container for many controls */}
        <input
          type="text"
          placeholder="Search for jobs by title, keyword, or company..." // Enhanced placeholder
          value={filterOptions.searchTerm}
          onChange={(e) => setFilterOptions({ ...filterOptions, searchTerm: e.target.value })}
        />
        <button className="search-button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="search-filters">
        {/* Role Filter */}
        <div className="filter-group">
          <div className="filter-select" onClick={() => toggleFilterMenu('role')}>
            {filterOptions.role || 'Job Role'} {/* Changed from Job Title to Job Role for clarity */}
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {filterMenuOpen.role && (
              <div className="filter-dropdown">
                {roleOptions.map((option, index) => (
                  <div
                    key={index}
                    className="filter-option"
                    onClick={() => handleFilterSelect('role', option)}
                  >
                    {option}
                  </div>
                ))}
                <div
                  className="filter-option clear-option"
                  onClick={() => handleFilterSelect('role', '')}
                >
                  Clear Selection
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Location Filter */}
        <div className="filter-group">
          <div className="filter-select" onClick={() => toggleFilterMenu('location')}>
            {filterOptions.location || 'Location'}
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {filterMenuOpen.location && (
              <div className="filter-dropdown">
                {locationOptions.map((option, index) => (
                  <div
                    key={index}
                    className="filter-option"
                    onClick={() => handleFilterSelect('location', option)}
                  >
                    {option}
                  </div>
                ))}
                <div
                  className="filter-option clear-option"
                  onClick={() => handleFilterSelect('location', '')}
                >
                  Clear Selection
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Experience Filter */}
        <div className="filter-group">
          <div className="filter-select" onClick={() => toggleFilterMenu('experience')}>
            {filterOptions.experience || 'Experience Level'}
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {filterMenuOpen.experience && (
              <div className="filter-dropdown">
                {experienceOptions.map((option, index) => (
                  <div
                    key={index}
                    className="filter-option"
                    onClick={() => handleFilterSelect('experience', option)}
                  >
                    {option}
                  </div>
                ))}
                <div
                  className="filter-option clear-option"
                  onClick={() => handleFilterSelect('experience', '')}
                >
                  Clear Selection
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Employment Type Filter */}
        <div className="filter-group">
          <div className="filter-select" onClick={() => toggleFilterMenu('employmentType')}>
            {filterOptions.employmentType || 'Employment Type'}
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {filterMenuOpen.employmentType && (
              <div className="filter-dropdown">
                {employmentTypeOptions.map((option, index) => (
                  <div
                    key={index}
                    className="filter-option"
                    onClick={() => handleFilterSelect('employmentType', option)}
                  >
                    {option}
                  </div>
                ))}
                <div
                  className="filter-option clear-option"
                  onClick={() => handleFilterSelect('employmentType', '')}
                >
                  Clear Selection
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Salary Range Filter */}
        <div className="filter-group salary-range-filter">
          <label htmlFor="salaryMax" className="filter-label">Max Salary: ${filterOptions.salaryRange[1].toLocaleString()}</label>
          <div className="salary-range">
            <span>${filterOptions.salaryRange[0].toLocaleString()}</span>
            <input
              type="range"
              id="salaryMax"
              min={filterOptions.salaryRange[0]} // Min of the range
              max="250000" // A higher possible max, adjust as needed
              value={filterOptions.salaryRange[1]}
              onChange={(e) => setFilterOptions({ ...filterOptions, salaryRange: [filterOptions.salaryRange[0], parseInt(e.target.value)] })}
              className="salary-range-input"
            />
            <span>${(250000).toLocaleString()}</span>
          </div>
        </div>

        {/* Sort By Filter */}
        <div className="filter-group">
          <div className="filter-select" onClick={() => setSortMenuOpen(!sortMenuOpen)}>
            Sort By: {sortBy.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {sortMenuOpen && (
              <div className="filter-dropdown sort-dropdown"> {/* Added sort-dropdown for specific styling if needed */}
                <div className="filter-option" onClick={() => { setSortBy('latest'); setSortMenuOpen(false); }}>Latest</div>
                <div className="filter-option" onClick={() => { setSortBy('oldest'); setSortMenuOpen(false); }}>Oldest</div>
                <div className="filter-option" onClick={() => { setSortBy('highest_salary'); setSortMenuOpen(false); }}>Highest Salary</div>
                <div className="filter-option" onClick={() => { setSortBy('lowest_salary'); setSortMenuOpen(false); }}>Lowest Salary</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="no-listings">
          <p>No job listings found.</p>
        </div>
      ) : (
        <div className="job-listings-grid">
          {filteredJobs.map(job => { // Changed from jobs.map to filteredJobs.map
            const company = companies[job.user_id] || {};
            const logoUrl = company.logo_url ? getImageUrl({ url: company.logo_url }) : getPlaceholderImage('user');

            return (
              <Link to={`/jobs/${job.id}`} key={job.id} className="job-card">
                <div className="company-logo">
                  <img src={logoUrl} alt={company.company_name || 'Company'} />
                </div>

                <div className="job-details">
                  <h2 className="job-title">{job.title}</h2>
                  <h3 className="company-name">{company.company_name || (job.company || 'Company')}</h3>

                  <div className="job-meta">
                    <span className="job-location">
                      <i className="meta-icon">📍</i> {job.location || 'Remote'}
                    </span>
                    <span className="job-type">
                      <i className="meta-icon">⏱️</i> {job.job_type || 'Full-time'} {/* Corrected from job.type */}
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
