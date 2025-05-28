import React, { useEffect, useState, useRef } from 'react';
import './JobListings.css';
import { getJobListings } from '../utils/jobService';

const JobListings = () => {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [filterOptions, setFilterOptions] = useState({
    role: '',
    location: '',
    experience: '',
    employmentType: '',
    salaryRange: [0, 200000],
    searchTerm: ''
  });
  
  const [filterValues, setFilterValues] = useState({
    workingSchedule: {
      fullTime: true,
      partTime: true,
      internship: false,
      projectWork: true,
      volunteering: false
    },
    employmentType: {
      fullDay: true,
      flexibleSchedule: true,
      shiftWork: true,
      distantWork: true,
      shiftMethod: false
    }
  });
  
  const [sortBy, setSortBy] = useState('latest');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState({
    role: false,
    location: false,
    experience: false,
    employmentType: false,
  });

  // Filter options
  const roleOptions = ['Designer', 'Developer', 'Manager', 'Engineer', 'Specialist', 'Other'];
  const locationOptions = ['Remote', 'San Francisco, CA', 'New York, NY', 'Chicago, IL', 'Austin, TX', 'Other'];
  const experienceOptions = ['Entry Level', 'Junior', 'Mid-Level', 'Senior', 'Lead', 'Executive'];
  const employmentTypeOptions = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship'];

  // Add a ref for closing dropdowns when clicking outside
  const dropdownRef = useRef(null);

  // Fetch jobs from the database
  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const jobData = await getJobListings();
        setJobs(jobData);
        setFilteredJobs(jobData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError('Failed to load jobs. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchJobs();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setFilterMenuOpen({
          role: false,
          location: false,
          experience: false,
          employmentType: false,
        });
        setSortMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Apply filters whenever filter options or values change
  useEffect(() => {
    if (!jobs || jobs.length === 0) return;
    
    try {
      let filtered = [...jobs];
      
      // Apply role filter - with defensive coding
      if (filterOptions.role) {
        filtered = filtered.filter(job => 
          job && job.title && job.title.toLowerCase().includes(filterOptions.role.toLowerCase())
        );
      }
      
      // Apply location filter - with defensive coding
      if (filterOptions.location) {
        filtered = filtered.filter(job => 
          job && job.location && job.location.toLowerCase().includes(filterOptions.location.toLowerCase())
        );
      }
      
      // Apply experience filter - with defensive coding
      if (filterOptions.experience) {
        filtered = filtered.filter(job => 
          job && job.experience_required && 
          job.experience_required.toLowerCase().includes(filterOptions.experience.toLowerCase())
        );
      }
      
      // Apply employment type filter - with defensive coding
      if (filterOptions.employmentType) {
        filtered = filtered.filter(job => 
          job && job.type && job.type.toLowerCase().includes(filterOptions.employmentType.toLowerCase())
        );
      }
      
      // Apply salary range filter - with safer parsing
      filtered = filtered.filter(job => {
        if (!job || job.salary === undefined || job.salary === null) return true;
        
        // Convert job.salary to number if it's a string (remove non-numeric characters)
        let salary;
        try {
          salary = typeof job.salary === 'string' 
            ? parseFloat(job.salary.replace(/[^0-9.-]+/g, ''))
            : job.salary;
        } catch (e) {
          return true; // Include jobs with unparseable salaries
        }
        
        return !isNaN(salary) && 
               salary >= filterOptions.salaryRange[0] && 
               salary <= filterOptions.salaryRange[1];
      });
      
      // Apply checkbox filters with safer checks
      if (Object.values(filterValues.workingSchedule).some(val => val === true)) {
        filtered = filtered.filter(job => {
          if (!job) return false;
          
          // Extract tags from job if they exist
          const tags = job.tags || [];
          let type = job && job.type ? job.type.toLowerCase() : '';
          
          return (
            (filterValues.workingSchedule.fullTime && 
              (tags.includes('Full time') || type.includes('full time'))) ||
            (filterValues.workingSchedule.partTime && 
              (tags.includes('Part time') || type.includes('part time'))) ||
            (filterValues.workingSchedule.internship && 
              (tags.includes('Internship') || type.includes('internship'))) ||
            (filterValues.workingSchedule.projectWork && 
              (tags.includes('Project work') || type.includes('project'))) ||
            (filterValues.workingSchedule.volunteering && 
              (tags.includes('Volunteering') || type.includes('volunteer')))
          );
        });
      }
      
      // Apply employment type filters with safer checks
      if (Object.values(filterValues.employmentType).some(val => val === true)) {
        filtered = filtered.filter(job => {
          if (!job) return false;
          
          // Extract tags from job if they exist
          const tags = job.tags || [];
          let description = job && job.description ? job.description.toLowerCase() : '';
          
          return (
            (filterValues.employmentType.fullDay && 
              (tags.includes('Full day') || description.includes('full day'))) ||
            (filterValues.employmentType.flexibleSchedule && 
              (tags.includes('Flexible schedule') || description.includes('flexible'))) ||
            (filterValues.employmentType.shiftWork && 
              (tags.includes('Shift work') || description.includes('shift'))) ||
            (filterValues.employmentType.distantWork && 
              (tags.includes('Distant work') || description.includes('remote') || 
              description.includes('distant'))) ||
            (filterValues.employmentType.shiftMethod && 
              (tags.includes('Shift method') || description.includes('shift method')))
          );
        });
      }
      
      // Apply search term filter - with defensive coding
      if (filterOptions.searchTerm) {
        const term = filterOptions.searchTerm.toLowerCase();
        filtered = filtered.filter(job => 
          (job && job.title && job.title.toLowerCase().includes(term)) ||
          (job && job.description && job.description.toLowerCase().includes(term)) ||
          (job && job.location && job.location.toLowerCase().includes(term))
        );
      }
      
      // Apply sorting with error handling
      try {
        switch(sortBy) {
          case 'latest':
            filtered.sort((a, b) => {
              if (!a || !a.created_at) return 1;
              if (!b || !b.created_at) return -1;
              return new Date(b.created_at) - new Date(a.created_at);
            });
            break;
          case 'oldest':
            filtered.sort((a, b) => {
              if (!a || !a.created_at) return 1;
              if (!b || !b.created_at) return -1;
              return new Date(a.created_at) - new Date(b.created_at);
            });
            break;
          case 'highest_salary':
            filtered.sort((a, b) => {
              const getSalary = (job) => {
                if (!job || job.salary === undefined || job.salary === null) return 0;
                try {
                  return typeof job.salary === 'string' ? 
                    parseFloat(job.salary.replace(/[^0-9.-]+/g, '')) : job.salary;
                } catch (e) {
                  return 0;
                }
              };
              
              return getSalary(b) - getSalary(a);
            });
            break;
          case 'lowest_salary':
            filtered.sort((a, b) => {
              const getSalary = (job) => {
                if (!job || job.salary === undefined || job.salary === null) return 0;
                try {
                  return typeof job.salary === 'string' ? 
                    parseFloat(job.salary.replace(/[^0-9.-]+/g, '')) : job.salary;
                } catch (e) {
                  return 0;
                }
              };
              
              return getSalary(a) - getSalary(b);
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
      // Fallback to showing all jobs if filtering fails
      setFilteredJobs(jobs);
    }
  }, [jobs, filterOptions, filterValues, sortBy]);

  // Toggle filter menu
  const toggleFilterMenu = (filterName) => {
    setFilterMenuOpen({
      ...filterMenuOpen,
      [filterName]: !filterMenuOpen[filterName]
    });
  };

  // Handle filter selection
  const handleFilterSelect = (filterName, value) => {
    setFilterOptions({
      ...filterOptions,
      [filterName]: value
    });
    toggleFilterMenu(filterName);
  };

  // Handle filter checkbox change
  const handleCheckboxChange = (category, name) => {
    setFilterValues({
      ...filterValues,
      [category]: {
        ...filterValues[category],
        [name]: !filterValues[category][name]
      }
    });
  };

  // Handle salary range change
  const handleSalaryRangeChange = (e) => {
    setFilterOptions({
      ...filterOptions,
      salaryRange: [filterOptions.salaryRange[0], parseInt(e.target.value)]
    });
  };

  // Format salary for display
  const formatSalary = (salary) => {
    if (!salary) return 'N/A';
    
    if (typeof salary === 'string') {
      // If already formatted, return as is
      if (salary.includes('$')) return salary;
      
      // Convert to number and format
      const num = parseFloat(salary);
      return isNaN(num) ? 'N/A' : `$${num.toLocaleString()}`;
    }
    
    // Format number
    return `$${salary.toLocaleString()}`;
  };

  // Format date for display with better error handling
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    } catch (e) {
      console.error('Date formatting error:', e);
      return 'N/A';
    }
  };

  // Function to extract tags from job data with null checks
  const extractTags = (job) => {
    if (!job) return [];
    
    const tags = [];
    if (job.type) tags.push(job.type);
    if (job.experience_required) tags.push(job.experience_required);
    if (job.location && job.location.toLowerCase().includes('remote')) tags.push('Remote');
    return tags;
  };

  // Get company first letter for logo with better null handling
  const getCompanyLogo = (job) => {
    if (!job) return '?';
    if (!job.company_name && !job.user_id) return '?';
    const source = job.company_name || `User ${job.user_id}`;
    return source.charAt(0).toUpperCase();
  };

  return (
    <div className="job-listings-container" ref={dropdownRef}>
      {/* Search bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search for jobs..."
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

      {/* Add loading and error states */}
      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading job listings...</p>
        </div>
      )}
      
      {error && !loading && (
        <div className="error-container">
          <div className="error-icon">!</div>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Retry
          </button>
        </div>
      )}

      {/* Display message if no jobs found */}
      {!loading && !error && filteredJobs.length === 0 && (
        <div className="no-results">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15 9L9 15" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 9L15 15" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3>No job listings found</h3>
          <p>Try adjusting your filters or search criteria</p>
          <button 
            onClick={() => {
              setFilterOptions({
                role: '',
                location: '',
                experience: '',
                employmentType: '',
                salaryRange: [0, 200000],
                searchTerm: ''
              });
            }} 
            className="clear-filters-button"
          >
            Clear All Filters
          </button>
        </div>
      )}
      
      {/* Search filters - continue with existing code */}
      <div className="search-filters">
        <div className="filter-group">
          <div className="filter-select" onClick={() => toggleFilterMenu('role')}>
            {filterOptions.role || 'Job Title'}
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
        
        <div className="filter-group">
          <div className="filter-select" onClick={() => toggleFilterMenu('experience')}>
            {filterOptions.experience || 'Experience'}
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
        
        {/* Salary range filter - added as a separate component */}
        <div className="filter-group salary-range-filter">
          <div className="filter-label">Salary Range</div>
          <div className="salary-range">
            <input 
              type="range" 
              min="0" 
              max="200000" 
              value={filterOptions.salaryRange[1]} 
              onChange={handleSalaryRangeChange}
              className="salary-range-input"
            />
            <div className="salary-range-labels">
              <span>${filterOptions.salaryRange[0].toLocaleString()}</span>
              <span>${filterOptions.salaryRange[1].toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Job listings - add this section to display the job cards properly */}
      {!loading && !error && filteredJobs.length > 0 && (
        <div className="job-cards-container">
          {filteredJobs.map((job, index) => (
            <div className="job-card" key={job.id || index}>
              <div className="job-card-header">
                <div className="company-logo">{getCompanyLogo(job)}</div>
                <div className="job-info">
                  <h3 className="job-title">{job.title || 'Untitled Position'}</h3>
                  <p className="company-name">{job.company_name || `Company #${job.user_id || 'Unknown'}`}</p>
                </div>
              </div>
              <div className="job-card-body">
                <p className="job-description">
                  {job.description ? 
                    (job.description.length > 150 ? 
                      `${job.description.substring(0, 150)}...` : 
                      job.description) :
                    'No description provided'}
                </p>
                <div className="job-tags">
                  {extractTags(job).map((tag, i) => (
                    <span className="job-tag" key={i}>{tag}</span>
                  ))}
                </div>
              </div>
              <div className="job-card-footer">
                <div className="job-salary">{formatSalary(job.salary)}</div>
                <div className="job-location">{job.location || 'Location not specified'}</div>
                <div className="job-date">{formatDate(job.created_at)}</div>
                <button className="apply-button">Apply Now</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobListings;
