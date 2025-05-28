import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext'; // Assuming you have AuthContext
import './ManageJobPostings.css';

const ManageJobPostings = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, isAuthenticated, token } = useContext(AuthContext); // Get user and auth status
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserJobs = async () => {
      if (!isAuthenticated || !user || !user.id) {
        setLoading(false);
        setError('You must be logged in as a company to manage job postings.');
        navigate('/login'); // Redirect if not logged in
        return;
      }

      try {
        setLoading(true);
        // Use the new endpoint to fetch jobs for the current user
        const response = await fetch(`/api/jobs/user/${user.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`, // Assuming token-based auth
          },
          credentials: 'include', // Send cookies if using session-based auth
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch your job postings: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
          setJobs(data.data);
        } else {
          throw new Error(data.error || 'Could not retrieve job postings.');
        }
      } catch (err) {
        console.error('Error fetching user job postings:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserJobs();
  }, [user, isAuthenticated, token, navigate]);

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job posting? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete job posting: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
        alert('Job posting deleted successfully.');
      } else {
        throw new Error(data.error || 'Failed to delete job posting.');
      }
    } catch (err) {
      console.error('Error deleting job:', err);
      setError(err.message);
      alert(`Error: ${err.message}`);
    }
  };

  const handleEditJob = (jobId) => {
    navigate(`/post-job/${jobId}`); // Navigate to the form for editing
  };
  
  if (!isAuthenticated || !user?.is_company) {
    return (
      <div className="manage-jobs-container error-container">
        <h2>Access Denied</h2>
        <p>You must be logged in as a verified company to manage job postings.</p>
        <Link to="/login" className="button-primary">Login</Link>
      </div>
    );
  }


  if (loading) {
    return (
      <div className="manage-jobs-container loading">
        <div className="loading-spinner"></div>
        <p>Loading your job postings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="manage-jobs-container error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <Link to="/" className="button-primary">Go Home</Link>
      </div>
    );
  }

  return (
    <div className="manage-jobs-container">
      <header className="manage-jobs-header">
        <h1>Manage Your Job Postings</h1>
        <Link to="/post-job" className="button-primary post-new-job-button">
          <i className="fas fa-plus-circle"></i> Post New Job
        </Link>
      </header>

      {jobs.length === 0 ? (
        <div className="no-jobs-message">
          <p>You haven't posted any jobs yet.</p>
          <Link to="/post-job" className="button-primary">Post Your First Job</Link>
        </div>
      ) : (
        <div className="job-listings-table-container">
          <table className="job-listings-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Company</th>
                <th>Location</th>
                <th>Status</th>
                <th>Posted On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.id}>
                  <td><Link to={`/jobs/${job.id}`} className="job-title-link">{job.title}</Link></td>
                  <td>{job.company}</td>
                  <td>{job.location}</td>
                  <td>
                    <span className={`status-badge ${job.is_published ? 'status-published' : 'status-draft'}`}>
                      {job.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td>{new Date(job.created_at).toLocaleDateString()}</td>
                  <td className="job-actions">
                    <button onClick={() => handleEditJob(job.id)} className="action-button edit-button">
                      <i className="fas fa-edit"></i> Edit
                    </button>
                    <Link to={`/jobs/${job.id}/applicants`} className="action-button view-applicants-button">
                      <i className="fas fa-users"></i> View Applicants
                    </Link>
                    <button onClick={() => handleDeleteJob(job.id)} className="action-button delete-button">
                      <i className="fas fa-trash-alt"></i> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ManageJobPostings;
