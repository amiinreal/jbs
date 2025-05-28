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
  const [jobCustomQuestions, setJobCustomQuestions] = useState([]);
  const [customAnswers, setCustomAnswers] = useState({}); // Store answers as { questionId: answer }

  useEffect(() => {
    const fetchJobAndRelatedData = async () => {
      try {
        setLoading(true);
        setError(null);
        setApplicationStatus(null); // Reset application status on job change
        setCustomAnswers({}); // Reset custom answers
        setJobCustomQuestions([]); // Reset custom questions

        // Fetch job details
        const jobResponse = await fetch(`/api/jobs/${jobId}`);
        if (!jobResponse.ok) throw new Error(`Failed to fetch job information: ${jobResponse.status}`);
        const jobResult = await jobResponse.json();
        if (!jobResult.success || !jobResult.data) throw new Error('No job data returned from server');
        
        const currentJob = jobResult.data;
        setJob(currentJob);

        // Fetch company details
        if (currentJob.user_id) {
          const companyResponse = await fetch(`/api/users/${currentJob.user_id}/public`);
          if (companyResponse.ok) {
            const companyData = await companyResponse.json();
            if (companyData.success) setCompany(companyData.data);
          } else {
            console.warn('Failed to fetch company information:', companyResponse.status);
          }
        }

        // Fetch custom questions if native application type
        if (currentJob.application_type === 'native') {
          const questionsResponse = await fetch(`/api/jobs/${jobId}/questions`);
          if (questionsResponse.ok) {
            const questionsResult = await questionsResponse.json();
            if (questionsResult.success) {
              setJobCustomQuestions(questionsResult.data.map(q => ({
                ...q,
                options: q.options ? JSON.parse(q.options) : [] // Ensure options are parsed
              })));
            } else {
               console.warn('Could not retrieve custom questions:', questionsResult.error);
            }
          } else {
            console.warn('Failed to fetch custom questions for job:', questionsResponse.status);
          }
        }

        // Check if user has already applied (if authenticated)
        if (isAuthenticated && user && currentJob.application_type === 'native') {
          const appCheckResponse = await fetch(`/api/jobs/${jobId}/applications/check`, { credentials: 'include' });
          if (appCheckResponse.ok) {
            const appCheckData = await appCheckResponse.json();
            if (appCheckData.hasApplied) setApplicationStatus('applied');
          } else {
             console.warn('Failed to check application status:', appCheckResponse.status);
          }
        }
      } catch (err) {
        console.error('Error loading job details:', err);
        setError(err.message || 'Failed to load job details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchJobAndRelatedData();
  }, [jobId, isAuthenticated, user]); // Rerun if jobId, user, or auth status changes
  
  const handleApplyClick = () => {
    if (!isAuthenticated) {
      sessionStorage.setItem('redirectAfterLogin', `/jobs/${jobId}`);
      navigate('/login');
      return;
    }
    if (job?.application_type === 'external' && job?.external_application_url) {
      let url = job.external_application_url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    setApplying(true);
  };

  const handleCustomAnswerChange = (questionId, value, questionType) => {
    setCustomAnswers(prev => {
      const newAnswers = { ...prev };
      if (questionType === 'checkbox') {
        const currentSelection = newAnswers[questionId] ? JSON.parse(newAnswers[questionId]) : [];
        if (currentSelection.includes(value)) {
          newAnswers[questionId] = JSON.stringify(currentSelection.filter(v => v !== value));
        } else {
          newAnswers[questionId] = JSON.stringify([...currentSelection, value]);
        }
        // If all checkboxes for this question are unchecked, make it an empty array string
        if (JSON.parse(newAnswers[questionId]).length === 0) {
            newAnswers[questionId] = JSON.stringify([]);
        }
      } else {
        newAnswers[questionId] = value;
      }
      return newAnswers;
    });
  };
  
  const handleApplicationSubmit = async (e) => {
    e.preventDefault();
    let submissionError = null;

    // Client-side validation for required custom questions
    for (const q of jobCustomQuestions) {
      if (q.is_required) {
        const answer = customAnswers[q.id];
        let answerIsEmpty = !answer || answer.trim() === '';
        if (q.question_type === 'checkbox') {
             answerIsEmpty = !answer || JSON.parse(answer).length === 0;
        }
        if (answerIsEmpty) {
          submissionError = `Please answer the required question: "${q.question_text}"`;
          break;
        }
      }
    }

    if (submissionError) {
      alert(submissionError); // Or display it more elegantly
      setApplicationStatus('error'); // Indicate an error state
      return;
    }

    const payload = new FormData();
    payload.append('coverLetter', applicationData.coverLetter);
    payload.append('phone', applicationData.phone);
    payload.append('availability', applicationData.availability);
    if (applicationData.resume) {
      payload.append('resume', applicationData.resume);
    }

    const formattedCustomAnswers = Object.entries(customAnswers).map(([question_id, answer_text]) => ({
      question_id: parseInt(question_id, 10),
      answer_text
    }));
    payload.append('custom_answers', JSON.stringify(formattedCustomAnswers)); // FormData expects string values

    try {
      const response = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        credentials: 'include',
        body: payload 
      });
      
      const result = await response.json(); // Try to parse JSON regardless of response.ok
      if (!response.ok) {
        throw new Error(result.error || `Application failed: ${response.status}`);
      }
      
      if (result.success) {
        setApplying(false);
        setApplicationStatus('success');
      } else {
        throw new Error(result.error || 'Application submission failed.');
      }
    } catch (err) {
      console.error('Error applying for job:', err);
      setApplicationStatus('error'); // Keep error state
      // Display specific error to user if available from server, otherwise generic
      alert(err.message || 'There was a problem submitting your application. Please try again later.');
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setApplicationData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value // Though no standard checkboxes in main form yet
    }));
  };
  
  const handleFileChange = (e) => {
    setApplicationData(prev => ({ ...prev, resume: e.target.files[0] }));
  };

  const renderCustomQuestionField = (q) => {
    const answer = customAnswers[q.id] || (q.question_type === 'checkbox' ? '[]' : '');
    const commonProps = {
      id: `custom_q_${q.id}`,
      name: `custom_q_${q.id}`,
      required: q.is_required,
    };

    switch (q.question_type) {
      case 'text':
        return <input type="text" {...commonProps} value={answer} onChange={(e) => handleCustomAnswerChange(q.id, e.target.value, q.question_type)} className="form-input" />;
      case 'textarea':
        return <textarea {...commonProps} value={answer} onChange={(e) => handleCustomAnswerChange(q.id, e.target.value, q.question_type)} rows="3" className="form-textarea"></textarea>;
      case 'select':
        return (
          <select {...commonProps} value={answer} onChange={(e) => handleCustomAnswerChange(q.id, e.target.value, q.question_type)} className="form-select">
            <option value="">Select an option</option>
            {q.options.map((opt, idx) => <option key={idx} value={opt}>{opt}</option>)}
          </select>
        );
      case 'radio':
        return (
          <div className="radio-group-vertical">
            {q.options.map((opt, idx) => (
              <label key={idx} className="radio-label">
                <input type="radio" name={commonProps.name} value={opt} checked={answer === opt} onChange={(e) => handleCustomAnswerChange(q.id, e.target.value, q.question_type)} required={q.is_required} />
                {opt}
              </label>
            ))}
          </div>
        );
      case 'checkbox': // Assuming multiple selections
        const selectedValues = JSON.parse(answer);
        return (
          <div className="checkbox-group-vertical">
            {q.options.map((opt, idx) => (
              <label key={idx} className="checkbox-label">
                <input type="checkbox" value={opt} checked={selectedValues.includes(opt)} onChange={(e) => handleCustomAnswerChange(q.id, e.target.value, q.question_type)} />
                {opt}
              </label>
            ))}
          </div>
        );
      default:
        return <p>Unsupported question type: {q.question_type}</p>;
    }
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
          {!applying && !applicationStatus && job && (
            <div className="application-cta">
              <button 
                onClick={handleApplyClick} 
                className="apply-button"
                disabled={applicationStatus === 'applied' && job.application_type === 'native'} 
              >
                {job.application_type === 'external' 
                  ? 'Apply on Company Site' 
                  : (applicationStatus === 'applied' ? 'Already Applied' : 'Apply for this Job')}
              </button>
            </div>
          )}
          
          {/* Native application form should only show if job.application_type is 'native' */}
          {applying && job?.application_type === 'native' && (
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
                  <input type="file" id="resume" name="resume" onChange={handleFileChange} accept=".pdf,.doc,.docx" className="form-input-file"/>
                  <small className="form-text">Upload your resume (PDF, DOC, or DOCX)</small>
                </div>
                
                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input type="tel" id="phone" name="phone" value={applicationData.phone} onChange={handleInputChange} placeholder="Your contact phone number" className="form-input"/>
                </div>
                
                <div className="form-group">
                  <label htmlFor="availability">Availability</label>
                  <input type="text" id="availability" name="availability" value={applicationData.availability} onChange={handleInputChange} placeholder="When can you start? Any scheduling constraints?" className="form-input"/>
                </div>

                {/* Custom Questions Section */}
                {jobCustomQuestions.length > 0 && (
                  <div className="custom-questions-section">
                    <h4>Additional Questions:</h4>
                    {jobCustomQuestions.map(q => (
                      <div key={q.id} className="form-group">
                        <label htmlFor={`custom_q_${q.id}`}>
                          {q.question_text}
                          {q.is_required && <span className="required-asterisk">*</span>}
                        </label>
                        {renderCustomQuestionField(q)}
                      </div>
                    ))}
                  </div>
                )}
                
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
