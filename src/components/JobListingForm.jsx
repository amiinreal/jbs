import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Editor } from '@tinymce/tinymce-react';
import './JobListingForm.css';
// import { createJobListing } from '../utils/jobService'; // We'll use fetch directly
import { AuthContext } from '../contexts/AuthContext';


const JobListingForm = ({ onSuccess }) => { // Removed user, isCompany, isVerifiedCompany props, will use AuthContext
  const { jobId } = useParams(); // Get jobId from URL for edit mode
  const navigate = useNavigate();
  const { user, isAuthenticated, token, isCompany, isVerifiedCompany } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    title: '',
    company: '',
    description: '',
    salary: '',
    location: '',
    job_type: 'full-time', // Renamed from type to job_type to match backend
    experience_required: '',
    contact_email: '', // Added
    contact_phone: '', // Added
    is_remote: false,  // Added
    is_published: true,
    application_type: 'native', // New field
    external_application_url: '' // New field
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null); // General component error (e.g., for verification)
  const [bannerImage, setBannerImage] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [submitError, setSubmitError] = useState(''); // Error specific to form submission
  const [successMessage, setSuccessMessage] = useState('');
  
  // State for custom questions
  const [customQuestions, setCustomQuestions] = useState([]);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null); // null for new, object for edit
  const [questionModalError, setQuestionModalError] = useState('');


  const editorRef = useRef(null); // For TinyMCE editor instance

  const isEditMode = Boolean(jobId);

  useEffect(() => {
    if (!isAuthenticated || !isCompany) {
      navigate('/login');
      return;
    }
    if (!isVerifiedCompany) {
      setError('Only verified companies can post or edit job listings. Please verify your company first.');
    } else {
      setError(null);
    }

    if (user?.company_name && !isEditMode) {
      setFormData(prevData => ({ ...prevData, company: user.company_name }));
    }
    
    const fetchInitialData = async () => {
      if (isEditMode) {
        setIsSubmitting(true); // Combined loading state for job and questions
        try {
          // Fetch job data
          const jobResponse = await fetch(`/api/jobs/${jobId}`, {
            credentials: 'include',
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (!jobResponse.ok) throw new Error('Failed to fetch job data.');
          const jobResult = await jobResponse.json();
          if (!jobResult.success || !jobResult.data) throw new Error(jobResult.error || 'Could not retrieve job data.');
          
          const jobData = jobResult.data;
          setFormData({
            title: jobData.title || '',
            company: jobData.company || user?.company_name || '',
            description: jobData.description || '',
            salary: jobData.salary || '',
            location: jobData.location || '',
            job_type: jobData.job_type || 'full-time',
            experience_required: jobData.experience_required || '',
            contact_email: jobData.contact_email || '',
            contact_phone: jobData.contact_phone || '',
            is_remote: jobData.is_remote || false,
            is_published: jobData.is_published !== undefined ? jobData.is_published : true,
            application_type: jobData.application_type || 'native',
            external_application_url: jobData.external_application_url || '',
            banner_image_url: jobData.banner_image_url || '', // Keep track for submission
          });
          if (jobData.banner_image_url) setBannerPreview(jobData.banner_image_url);
          if (editorRef.current) editorRef.current.setContent(jobData.description || '');

          // Fetch custom questions if native application type
          if (jobData.application_type === 'native') {
            const questionsResponse = await fetch(`/api/jobs/${jobId}/questions`, {
              headers: { 'Authorization': `Bearer ${token}` },
              credentials: 'include',
            });
            if (!questionsResponse.ok) throw new Error('Failed to fetch custom questions.');
            const questionsResult = await questionsResponse.json();
            if (questionsResult.success) {
              setCustomQuestions(questionsResult.data.map(q => ({
                ...q,
                options: q.options ? JSON.parse(q.options) : [] // Parse options string
              })));
            } else {
              throw new Error(questionsResult.error || 'Could not retrieve custom questions.');
            }
          } else {
            setCustomQuestions([]); // Clear questions if not native
          }
        } catch (fetchError) {
          console.error('Error fetching initial data:', fetchError);
          setSubmitError(`Error loading data: ${fetchError.message}`);
        } finally {
          setIsSubmitting(false);
        }
      }
    };
    fetchInitialData();
  }, [jobId, isEditMode, user, isAuthenticated, isCompany, isVerifiedCompany, token, navigate]);


  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newFormData = {
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    };
    setFormData(newFormData);

    // If application type is changed to external, clear custom questions
    if (name === "application_type" && value === "external") {
        setCustomQuestions([]); 
        // Optionally, one might want to prompt the user or even delete existing questions from DB here,
        // but for now, just clearing from UI state. Backend will not use them if type is external.
    }
     // If application type changed to native and in edit mode, fetch questions
    if (name === "application_type" && value === "native" && isEditMode && jobId) {
      fetchCustomQuestionsForJob(jobId);
    }
  };
  
  const fetchCustomQuestionsForJob = async (currentJobId) => {
    try {
      const questionsResponse = await fetch(`/api/jobs/${currentJobId}/questions`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });
      if (!questionsResponse.ok) throw new Error('Failed to fetch custom questions.');
      const questionsResult = await questionsResponse.json();
      if (questionsResult.success) {
         setCustomQuestions(questionsResult.data.map(q => ({
            ...q,
            options: q.options ? JSON.parse(q.options) : [] 
          })));
      } else {
        console.error("Failed to fetch questions:", questionsResult.error);
        setCustomQuestions([]);
      }
    } catch (error) {
      console.error("Error fetching custom questions:", error);
      setCustomQuestions([]);
    }
  };


  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBannerImage(file); // Store the file object for upload
      setBannerPreview(URL.createObjectURL(file)); // For local preview
    }
  };

  const removeBanner = () => {
    if (bannerPreview && bannerPreview.startsWith('blob:')) { // Only revoke if it's a blob URL
      URL.revokeObjectURL(bannerPreview);
    }
    setBannerImage(null);
    setBannerPreview(null);
    // If in edit mode and removing an existing banner, we might need to clear `formData.banner_image_url`
    // and make a specific API call or handle it during submission.
    // For simplicity, we'll assume the backend handles empty banner_image_url string as "remove".
    setFormData(prev => ({ ...prev, banner_image_url: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isVerifiedCompany) {
      setSubmitError('Your company must be verified to post or update job listings.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError('');
    setSuccessMessage('');

    try {
      if (!formData.title || !formData.company || !formData.location) {
        setSubmitError('Please fill in all required fields (Title, Company Name, Location).');
        setIsSubmitting(false);
        return;
      }

      let bannerUrl = formData.banner_image_url || ''; // Keep existing if not changed

      if (bannerImage) { // If a new banner image is selected
        const imageFormData = new FormData();
        imageFormData.append('images', bannerImage); // 'images' as expected by your upload endpoint
        
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const bannerUploadResponse = await fetch(`${backendUrl}/api/upload/jobs`, {
          method: 'POST',
          credentials: 'include', // Or Authorization header
          headers: { 'Authorization': `Bearer ${token}` },
          body: imageFormData,
        });

        if (!bannerUploadResponse.ok) {
          const uploadErrorData = await bannerUploadResponse.json().catch(() => ({}));
          throw new Error(uploadErrorData.error || `Failed to upload banner image: ${bannerUploadResponse.status}`);
        }
        const bannerData = await bannerUploadResponse.json();
        bannerUrl = bannerData.urls?.[0] || '';
      } else if (bannerPreview === null && isEditMode && formData.banner_image_url) {
        // This means the user explicitly removed an existing banner without uploading a new one.
        bannerUrl = ''; // Send empty string to indicate removal
      }


      const jobPayload = {
        ...formData,
        banner_image_url: bannerUrl,
      };
      
      // Remove id from payload if it exists, as it's not part of the request body for create/update
      // The id is in the URL for update.
      delete jobPayload.id;


      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const url = isEditMode ? `${backendUrl}/api/jobs/${jobId}` : `${backendUrl}/api/jobs`;
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Add token for auth
        },
        credentials: 'include', // Use if session-based
        body: JSON.stringify(jobPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); // Try to parse JSON error
        throw new Error(errorData.error || `Error: ${response.statusText} (${response.status})`);
      }

      const result = await response.json();
      
      setSuccessMessage(isEditMode ? 'Job listing updated successfully!' : 'Job listing created successfully!');
      
      if (onSuccess) {
        onSuccess(result.data);
      }
      
      // Navigate to manage listings page after a short delay
      setTimeout(() => {
        navigate('/my-listings'); // Or specific job page: `/jobs/${result.data.id}`
      }, 2000);

    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} job listing:`, error);
      setSubmitError(error.message || `Failed to ${isEditMode ? 'update' : 'create'} job listing.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditorChange = (content, editor) => {
    setFormData(prev => ({ ...prev, description: content }));
  };

  // Disable form if not verified or error
  const formDisabled = !isVerifiedCompany || !!error || isSubmitting;

  // Custom Question Modal Handlers
  const handleOpenQuestionModal = (question = null) => {
    setQuestionModalError('');
    if (question) {
      setCurrentQuestion({ ...question, options: Array.isArray(question.options) ? question.options.join('\n') : '' });
    } else {
      setCurrentQuestion({ question_text: '', question_type: 'text', options: '', is_required: false, sort_order: customQuestions.length });
    }
    setShowQuestionModal(true);
  };

  const handleCloseQuestionModal = () => {
    setShowQuestionModal(false);
    setCurrentQuestion(null);
    setQuestionModalError('');
  };

  const handleQuestionDataChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentQuestion(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSaveQuestion = async () => {
    if (!currentQuestion || !currentQuestion.question_text || !currentQuestion.question_type) {
      setQuestionModalError('Question text and type are required.');
      return;
    }
    if (['select', 'radio', 'checkbox'].includes(currentQuestion.question_type) && (!currentQuestion.options || currentQuestion.options.trim() === '')) {
        setQuestionModalError('Options are required for this question type (one per line).');
        return;
    }
    setQuestionModalError('');

    const questionPayload = {
      ...currentQuestion,
      options: ['select', 'radio', 'checkbox'].includes(currentQuestion.question_type) ? currentQuestion.options.split('\n').map(opt => opt.trim()).filter(opt => opt) : null,
      job_id: jobId // Ensure job_id is part of the payload for new questions
    };
    
    const url = currentQuestion.id 
      ? `/api/jobs/${jobId}/questions/${currentQuestion.id}` // Corrected PUT route
      : `/api/jobs/${jobId}/questions`;
    const method = currentQuestion.id ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(questionPayload),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Failed to save question: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        fetchCustomQuestionsForJob(jobId); // Re-fetch all questions to ensure sync
        handleCloseQuestionModal();
      } else {
        setQuestionModalError(result.error || 'Failed to save question.');
      }
    } catch (err) {
      console.error('Error saving question:', err);
      setQuestionModalError(err.message);
    }
  };

  const handleDeleteQuestion = async (questionIdToDelete) => {
    if (!window.confirm('Are you sure you want to delete this custom question?')) return;
    try {
      const response = await fetch(`/api/jobs/${jobId}/questions/${questionIdToDelete}`, { // Corrected DELETE route
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Failed to delete question: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        setCustomQuestions(prev => prev.filter(q => q.id !== questionIdToDelete));
      } else {
        alert(`Error: ${result.error || 'Failed to delete question.'}`);
      }
    } catch (err) {
      console.error('Error deleting question:', err);
      alert(`Error: ${err.message}`);
    }
  };


  return (
    <div className="job-listing-form-container">
      <h1>{isEditMode ? 'Edit Job Listing' : 'Post a New Job'}</h1>
      
      {error && <div className="error-message global-error">{error}</div>}
      
      <form onSubmit={handleSubmit} className="job-listing-form">
        {/* ... existing form fields ... */}
        {/* Title */}
        <div className="form-group">
          <label htmlFor="title">Job Title*</label>
          <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} required disabled={formDisabled} />
        </div>
        
        {/* Company Name */}
        <div className="form-group">
          <label htmlFor="company">Company Name*</label>
          <input type="text" id="company" name="company" value={formData.company} onChange={handleChange} required disabled={formDisabled || (isCompany && !isEditMode)} className={(isCompany && !isEditMode) ? "prefilled" : ""} />
          {(isCompany && !isEditMode && user?.company_name) && <small className="form-text">This field is automatically filled. You can change it if needed.</small>}
        </div>
        
        <div className="form-group">
          <label htmlFor="location">Location*</label>
          <input type="text" id="location" name="location" value={formData.location} onChange={handleChange} required disabled={formDisabled} placeholder="e.g., New York, NY or Remote" />
        </div>

        <div className="form-group">
          <label htmlFor="job_type">Job Type*</label>
          <select id="job_type" name="job_type" value={formData.job_type} onChange={handleChange} required disabled={formDisabled}>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="freelance">Freelance</option>
            <option value="internship">Internship</option>
            <option value="temporary">Temporary</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="salary">Salary/Compensation</label>
          <input type="text" id="salary" name="salary" value={formData.salary} onChange={handleChange} disabled={formDisabled} placeholder="e.g., $50,000 - $70,000 per year or Competitive" />
        </div>

        <div className="form-group">
          <label htmlFor="experience_required">Experience Required</label>
          <select id="experience_required" name="experience_required" value={formData.experience_required} onChange={handleChange} disabled={formDisabled}>
            <option value="">Select experience level</option>
            <option value="entry">Entry Level (0-1 years)</option>
            <option value="junior">Junior (1-3 years)</option>
            <option value="mid">Mid-Level (3-5 years)</option>
            <option value="senior">Senior (5+ years)</option>
            <option value="executive">Executive (10+ years)</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="contact_email">Contact Email</label>
          <input type="email" id="contact_email" name="contact_email" value={formData.contact_email} onChange={handleChange} disabled={formDisabled} placeholder="jobs@example.com"/>
        </div>

        <div className="form-group">
          <label htmlFor="contact_phone">Contact Phone</label>
          <input type="tel" id="contact_phone" name="contact_phone" value={formData.contact_phone} onChange={handleChange} disabled={formDisabled} placeholder="(123) 456-7890"/>
        </div>

        <div className="form-group form-group-checkbox">
          <input type="checkbox" id="is_remote" name="is_remote" checked={formData.is_remote} onChange={handleChange} disabled={formDisabled} />
          <label htmlFor="is_remote">This is a remote position</label>
        </div>
        
        <div className="form-group form-group-checkbox">
          <input type="checkbox" id="is_published" name="is_published" checked={formData.is_published} onChange={handleChange} disabled={formDisabled} />
          <label htmlFor="is_published">Publish this job listing immediately</label>
        </div>

        <fieldset className="form-group application-method-group">
          <legend>Application Method*</legend>
          <div className="radio-group">
            <div className="radio-option">
              <input type="radio" id="application_type_native" name="application_type" value="native" checked={formData.application_type === 'native'} onChange={handleChange} disabled={formDisabled}/>
              <label htmlFor="application_type_native">Accept Applications Natively (on this site)</label>
            </div>
            <div className="radio-option">
              <input type="radio" id="application_type_external" name="application_type" value="external" checked={formData.application_type === 'external'} onChange={handleChange} disabled={formDisabled}/>
              <label htmlFor="application_type_external">Redirect to External Link</label>
            </div>
          </div>
        </fieldset>

        {formData.application_type === 'external' && (
          <div className="form-group">
            <label htmlFor="external_application_url">External Application URL*</label>
            <input type="url" id="external_application_url" name="external_application_url" value={formData.external_application_url} onChange={handleChange} required={formData.application_type === 'external'} disabled={formDisabled} placeholder="https://yourcompany.com/careers/job-opening"/>
            <small className="form-text">Required if "Redirect to External Link" is selected.</small>
          </div>
        )}
        
        {/* Custom Questions Section - only if native application and in edit mode */}
        {isEditMode && formData.application_type === 'native' && (
          <fieldset className="form-group custom-questions-fieldset">
            <legend>Custom Application Questions</legend>
            {customQuestions.length > 0 && (
              <ul className="custom-questions-list">
                {customQuestions.map((q, index) => (
                  <li key={q.id || index} className="custom-question-item">
                    <div className="question-info">
                      <span className="question-text"><strong>{q.sort_order + 1}. {q.question_text}</strong> ({q.question_type}) {q.is_required ? '*' : ''}</span>
                      {q.options && q.options.length > 0 && (
                        <span className="question-options">Options: {q.options.join(', ')}</span>
                      )}
                    </div>
                    <div className="question-actions">
                      <button type="button" onClick={() => handleOpenQuestionModal(q)} className="action-button edit-button-small">Edit</button>
                      <button type="button" onClick={() => handleDeleteQuestion(q.id)} className="action-button delete-button-small">Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={() => handleOpenQuestionModal()} className="button-secondary add-question-button" disabled={formDisabled}>
              + Add Custom Question
            </button>
          </fieldset>
        )}


        <div className="form-group">
          <label htmlFor="description">Job Description*</label>
          <Editor
            tinymceScriptSrc="/tinymce/tinymce.min.js"
            onInit={(evt, editor) => editorRef.current = editor}
            initialValue={formData.description}
            value={formData.description}
            init={{
              height: 350, menubar: false,
              plugins: 'lists link autolink charmap code help wordcount',
              toolbar: 'undo redo | blocks | bold italic underline | bullist numlist | link | code | removeformat | help',
              content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
              apiKey: import.meta.env.VITE_TINYMCE_API_KEY || 'no-api-key'
            }}
            disabled={formDisabled}
            onEditorChange={handleEditorChange}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="banner">Job Banner Image</label>
          <input type="file" id="banner" accept="image/*" onChange={handleBannerChange} disabled={formDisabled} />
          {bannerPreview && (
            <div className="banner-preview">
              <img src={bannerPreview} alt="Banner preview" />
              <button type="button" className="remove-banner-btn" onClick={removeBanner} disabled={formDisabled}>Remove Banner</button>
            </div>
          )}
        </div>
        
        <div className="form-actions">
          <button type="button" className="cancel-button" onClick={() => navigate('/my-listings')} disabled={isSubmitting}>Cancel</button>
          <button type="submit" className="submit-button" disabled={formDisabled}>
            {isSubmitting ? (isEditMode ? 'Updating...' : 'Posting...') : (isEditMode ? 'Update Job' : 'Post Job')}
          </button>
        </div>
        
        {!isVerifiedCompany && isCompany && !error && (
          <div className="verification-notice">
            <p>Your company needs to be verified before you can post or edit job listings.</p>
            <button type="button" className="verification-button" onClick={() => navigate('/verification-status')}>Check Verification Status</button>
          </div>
        )}
      </form>
      
      {submitError && <div className="error-message submit-error">{submitError}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      {/* Modal for Adding/Editing Custom Question */}
      {showQuestionModal && (
        <div className="modal-overlay">
          <div className="modal-content custom-question-modal">
            <h2>{currentQuestion?.id ? 'Edit' : 'Add'} Custom Question</h2>
            {questionModalError && <p className="error-message">{questionModalError}</p>}
            <div className="form-group">
              <label htmlFor="question_text">Question Text*</label>
              <textarea 
                id="question_text" 
                name="question_text" 
                value={currentQuestion?.question_text || ''} 
                onChange={handleQuestionDataChange}
                rows="3"
              />
            </div>
            <div className="form-group">
              <label htmlFor="question_type">Question Type*</label>
              <select 
                id="question_type" 
                name="question_type" 
                value={currentQuestion?.question_type || 'text'} 
                onChange={handleQuestionDataChange}
              >
                <option value="text">Short Text</option>
                <option value="textarea">Paragraph</option>
                <option value="select">Dropdown (Single Select)</option>
                <option value="radio">Radio Buttons (Single Select)</option>
                <option value="checkbox">Checkboxes (Multiple Select)</option>
              </select>
            </div>
            {['select', 'radio', 'checkbox'].includes(currentQuestion?.question_type) && (
              <div className="form-group">
                <label htmlFor="options">Options (one per line)*</label>
                <textarea 
                  id="options" 
                  name="options" 
                  value={currentQuestion?.options || ''} 
                  onChange={handleQuestionDataChange}
                  rows="4"
                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                />
              </div>
            )}
            <div className="form-group form-group-checkbox">
              <input 
                type="checkbox" 
                id="is_required" 
                name="is_required" 
                checked={currentQuestion?.is_required || false} 
                onChange={handleQuestionDataChange}
              />
              <label htmlFor="is_required">Required</label>
            </div>
             <div className="form-group">
              <label htmlFor="sort_order">Sort Order</label>
              <input 
                type="number"
                id="sort_order" 
                name="sort_order" 
                value={currentQuestion?.sort_order === undefined ? customQuestions.length : currentQuestion.sort_order}
                onChange={handleQuestionDataChange}
              />
            </div>
            <div className="modal-actions">
              <button type="button" onClick={handleCloseQuestionModal} className="button-secondary">Cancel</button>
              <button type="button" onClick={handleSaveQuestion} className="button-primary">Save Question</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobListingForm;
