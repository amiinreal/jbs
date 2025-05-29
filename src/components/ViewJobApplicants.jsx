import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import './ViewJobApplicants.css'; // We'll create this CSS file later

const ViewJobApplicants = () => {
  const { jobId } = useParams(); // Get jobId from URL
  const { user, isAuthenticated, token } = useContext(AuthContext);
  const [applications, setApplications] = useState([]);
  const [jobTitle, setJobTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedApplicationId, setExpandedApplicationId] = useState(null);

  useEffect(() => {
    const fetchApplicants = async () => {
      if (!isAuthenticated || !user) {
        setError('You must be logged in to view applicants.');
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // First, fetch job details to get the title and verify ownership (implicitly by API)
        const jobResponse = await fetch(`/api/jobs/${jobId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include',
        });
        if (!jobResponse.ok) {
          const jobErrorData = await jobResponse.json().catch(() => ({}));
          throw new Error(jobErrorData.error || `Failed to fetch job details: ${jobResponse.status}`);
        }
        const jobResult = await jobResponse.json();
        if (!jobResult.success || !jobResult.data) {
          throw new Error(jobResult.error || 'Could not retrieve job details.');
        }
        setJobTitle(jobResult.data.title);
        
        // Now fetch applications for this job
        const response = await fetch(`/api/jobs/${jobId}/applications`, {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch applicants: ${response.status}`);
        }
        const data = await response.json();
        if (data.success) {
          setApplications(data.data);
        } else {
          throw new Error(data.error || 'Could not retrieve applicants.');
        }
      } catch (err) {
        console.error('Error fetching applicants:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchApplicants();
  }, [jobId, isAuthenticated, user, token]);

  const toggleApplicationDetail = (appId) => {
    setExpandedApplicationId(expandedApplicationId === appId ? null : appId);
  };

  if (loading) {
    return (
      <div className="view-applicants-container loading">
        <div className="loading-spinner"></div>
        <p>Loading applicants...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="view-applicants-container error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <Link to="/manage-jobs" className="button-primary">Back to My Job Postings</Link>
      </div>
    );
  }

  return (
    <div className="view-applicants-container">
      <header className="applicants-header">
        <h1>Applicants for "{jobTitle}"</h1>
        <Link to="/manage-jobs" className="button-secondary">&larr; Back to My Job Postings</Link>
      </header>

      {applications.length === 0 ? (
        <p className="no-applicants-message">No applications received for this job yet.</p>
      ) : (
        <ul className="applicants-list">
          {applications.map(app => (
            <li key={app.id} className="applicant-item">
              <div className="applicant-summary" onClick={() => toggleApplicationDetail(app.id)}>
                <div className="applicant-info">
                  <span className="applicant-name">{app.applicant_username || `User ID: ${app.user_id}`}</span>
                  <span className="applicant-email">{app.applicant_email}</span>
                </div>
                <div className="applicant-meta">
                  <span className="application-date">Applied: {new Date(app.created_at).toLocaleDateString()}</span>
                  <span className={`application-status status-${app.status}`}>{app.status}</span>
                </div>
                <button className="details-toggle-button">
                  {expandedApplicationId === app.id ? 'Hide Details' : 'View Details'}
                </button>
              </div>

              {expandedApplicationId === app.id && (
                <div className="application-details">
                  <h4>Application Details:</h4>
                  <p><strong>Cover Letter:</strong></p>
                  <pre className="cover-letter-text">{app.cover_letter || 'N/A'}</pre>
                  
                  <p><strong>Phone:</strong> {app.phone || 'N/A'}</p>
                  <p><strong>Availability:</strong> {app.availability || 'N/A'}</p>
                  
                  {app.resume_path && (
                    <p>
                      <strong>Resume:</strong>{' '}
                      <a href={app.resume_path} target="_blank" rel="noopener noreferrer" className="resume-link">
                        View Resume
                      </a>
                    </p>
                  )}

                  {app.custom_application_responses && app.custom_application_responses.length > 0 && (
                    <div className="custom-responses-section">
                      <h4>Additional Information:</h4>
                      <dl className="custom-responses-list">
                        {app.custom_application_responses.map((response, index) => (
                          <React.Fragment key={index}>
                            <dt>{response.question_text}</dt>
                            <dd>{response.answer_text || 'N/A'}</dd>
                          </React.Fragment>
                        ))}
                      </dl>
                    </div>
                  )}
                  {/* Add more application fields as needed */}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ViewJobApplicants;

