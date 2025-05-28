import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './JobListingForm.css';

const JobListingForm = ({ onSuccess, user, isCompany, isVerifiedCompany }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    company: '', // Changed from companyName to match API field
    description: '',
    salary: '',
    location: '',
    type: 'full-time',
    experience_required: '',
    is_published: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [bannerImage, setBannerImage] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Add a ref for the Quill editor
  const quillRef = useRef(null);
  
  // Fetch current user data to prefill company name
  useEffect(() => {
    // Check if user is verified company
    if (!isVerifiedCompany) {
      setError('Only verified companies can post job listings. Please verify your company first.');
    }
    
    // Pre-fill company name if available
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/users/me', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const userData = await response.json();
          // Update form data with company name from user data
          setFormData(prevData => ({
            ...prevData,
            company: userData.data?.company_name || ''
          }));
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };

    fetchCurrentUser();
  }, [isVerifiedCompany]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBannerImage(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const removeBanner = () => {
    if (bannerPreview) {
      URL.revokeObjectURL(bannerPreview);
    }
    setBannerImage(null);
    setBannerPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      // Validate required fields
      if (!formData.title || !formData.company || !formData.location) {
        setSubmitError('Please fill in all required fields.');
        setIsSubmitting(false);
        return;
      }

      // Upload banner image if available
      let bannerUrl = '';
      
      if (bannerImage) {
        const imageFormData = new FormData();
        imageFormData.append('images', bannerImage);
        
        try {
          const bannerUploadResponse = await fetch('/api/upload/jobs', {
            method: 'POST',
            credentials: 'include',
            body: imageFormData
          });
          
          if (!bannerUploadResponse.ok) {
            throw new Error(`Failed to upload banner image: ${bannerUploadResponse.status}`);
          }
          
          const bannerData = await bannerUploadResponse.json();
          bannerUrl = bannerData.urls?.[0] || '';
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          // Continue with job creation even if image upload fails
          bannerUrl = '';
        }
      }
      
      // Prepare the job data
      const jobData = {
        title: formData.title,
        description: formData.description,
        salary: formData.salary,
        location: formData.location,
        type: formData.type,
        experience_required: formData.experience_required,
        is_published: true,
        banner_image_url: bannerUrl,
        image_url: bannerUrl // For consistency
      };
      
      // Log request for debugging
      console.log('Submitting job data:', jobData);
      
      // Check if the API endpoint is available
      const checkEndpoint = await fetch('/api/jobs', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      // If endpoint returns 404, the route probably doesn't exist
      if (checkEndpoint.status === 404) {
        throw new Error('Job creation API is not available. Please contact support or check server configuration.');
      }
      
      // Send the job posting data to the API
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Job listing created successfully:', result);
      
      // Clear form and show success message
      setFormData({
        title: '',
        company: user?.company_name || '',
        description: '',
        salary: '',
        location: '',
        type: 'full-time',
        experience_required: '',
        is_published: true
      });
      
      setSuccessMessage('Job listing created successfully!');
      
      // Call the onSuccess callback if provided
      if (onSuccess) {
        onSuccess(result);
      }
      
      // Redirect to jobs page after short delay
      setTimeout(() => {
        navigate('/jobs');
      }, 2000);
    } catch (error) {
      console.error('Error creating job listing:', error);
      setSubmitError(error.message || 'Failed to create job listing. Please try again later.');
    } finally {
      setIsSubmitting(false);
      
      // Clear success message after 3 seconds
      if (successMessage) {
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      }
    }
  };

  // Quill modules and formats configuration
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      ['link'],
      ['clean']
    ],
  };
  
  const formats = [
    'header',
    'bold', 'italic', 'underline',
    'list', 'bullet',
    'link'
  ];
  
  return (
    <div className="job-listing-form-container">
      <h1>Post a Job</h1>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="job-listing-form">
        <div className="form-group">
          <label htmlFor="title">Job Title*</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            disabled={!isVerifiedCompany}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="company">Company Name*</label>
          <input
            type="text"
            id="company"
            name="company"
            value={formData.company}
            onChange={handleChange}
            required
            readOnly={isCompany}
            className={isCompany ? "prefilled" : ""}
            disabled={!isVerifiedCompany}
          />
          {isCompany && (
            <small className="form-text">
              This field is automatically filled with your company name.
            </small>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="location">Location*</label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
            disabled={!isVerifiedCompany}
            placeholder="e.g., New York, NY or Remote"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="type">Job Type*</label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            required
            disabled={!isVerifiedCompany}
          >
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="freelance">Freelance</option>
            <option value="internship">Internship</option>
            <option value="temporary">Temporary</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="salary">Salary/Compensation*</label>
          <input
            type="text"
            id="salary"
            name="salary"
            value={formData.salary}
            onChange={handleChange}
            required
            disabled={!isVerifiedCompany}
            placeholder="e.g., $50,000 - $70,000 per year"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="experience_required">Experience Required*</label>
          <select
            id="experience_required"
            name="experience_required"
            value={formData.experience_required}
            onChange={handleChange}
            required
            disabled={!isVerifiedCompany}
          >
            <option value="">Select experience level</option>
            <option value="entry">Entry Level (0-1 years)</option>
            <option value="junior">Junior (1-3 years)</option>
            <option value="mid">Mid-Level (3-5 years)</option>
            <option value="senior">Senior (5+ years)</option>
            <option value="executive">Executive (10+ years)</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Job Description*</label>
          <div className="rich-text-editor-container">
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={formData.description}
              onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
              modules={modules}
              formats={formats}
              placeholder="Describe the job responsibilities, qualifications, and other relevant details..."
              required
              disabled={!isVerifiedCompany}
            />
            {!isVerifiedCompany && (
              <div className="editor-disabled-overlay">
                <p>Verification required to edit</p>
              </div>
            )}
          </div>
          <p className="editor-hint">
            Use the toolbar to format your description with headers, bullet points, and more.
          </p>
        </div>
        
        <div className="form-group">
          <label htmlFor="banner">Job Banner Image</label>
          <input
            type="file"
            id="banner"
            accept="image/*"
            onChange={handleBannerChange}
            disabled={!isVerifiedCompany}
          />
          {bannerPreview && (
            <div className="banner-preview">
              <img src={bannerPreview} alt="Banner preview" />
              <button 
                type="button" 
                className="remove-banner-btn"
                onClick={removeBanner}
              >
                Remove Banner
              </button>
            </div>
          )}
        </div>
        
        <div className="form-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={() => navigate('/my-listings')}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting || !isVerifiedCompany}
          >
            {isSubmitting ? 'Posting...' : 'Post Job'}
          </button>
        </div>
        
        {!isVerifiedCompany && isCompany && (
          <div className="verification-notice">
            <p>Your company needs to be verified before you can post job listings.</p>
            <button
              type="button"
              className="verification-button"
              onClick={() => navigate('/verification-status')}
            >
              Check Verification Status
            </button>
          </div>
        )}
      </form>
      
      {submitError && (
        <div className="error-message">
          {submitError}
        </div>
      )}
      
      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default JobListingForm;