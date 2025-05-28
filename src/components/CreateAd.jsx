import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './CreateAd.css';
import HouseListingForm from './HouseListingForm';
import { createJobListing } from '../utils/jobService';
import { checkApiHealth } from '../utils/apiHealth';

const CreateAd = ({ isCompany, isVerifiedCompany, user, initialType }) => {
  // Initialize adType with initialType if provided
  const [adType, setAdType] = useState(initialType || 'house');
  const [formData, setFormData] = useState({});
  const [images, setImages] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [bannerImage, setBannerImage] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  
  // Add a ref for the Quill editor
  const quillRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialAdType = queryParams.get('type') || 'job';

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

  useEffect(() => {
    // Set initial ad type from URL query parameter
    if (queryParams.get('type')) {
      setAdType(queryParams.get('type'));
    }
    
    // If initialType is provided, update the adType
    if (initialType) {
      setAdType(initialType);
    }
    
    // If the current adType is 'job' and user is a company, pre-fill company name
    if ((adType === 'job' || initialType === 'job') && isCompany && user?.company_name) {
      setFormData(prevData => ({
        ...prevData,
        companyName: user.company_name
      }));
    }
  }, [adType, initialType, location, isCompany, user]);

  // Add the missing handleInputChange function
  const handleInputChange = (event) => {
    const { name, value } = event.target;
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

  // Handle ad type change and reset form
  const handleAdTypeChange = (event) => {
    setAdType(event.target.value);
    setFormData({});
    setImages([]);
    setPreviewImages([]);
    setBannerImage(null);
    setBannerPreview(null);
    setError('');
    setSuccess(false);
  };

  // Handle successful form submission
  const handleSuccess = (data) => {
    setSuccess(true);
    setFormData({});
    setImages([]);
    setPreviewImages([]);
    
    // Clear success message after 3 seconds
    setTimeout(() => setSuccess(false), 3000);
  };

  // Handle direct navigation to add-house-listing
  const handleNavigateToHouseListing = () => {
    navigate('/add-house-listing');
  };

  // Add validation before allowing job creation
  const canCreateJobListing = isCompany && isVerifiedCompany;

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setError('');
    
    try {
      // Validate required fields based on ad type
      if (adType === 'job') {
        if (!formData.title || !formData.companyName || !formData.location) {
          throw new Error('Please fill in all required fields.');
        }
        
        if (!canCreateJobListing) {
          throw new Error('Only verified companies can post job listings.');
        }
        
        // Check if API is responding before attempting to create job
        const healthCheck = await checkApiHealth();
        if (!healthCheck.ok) {
          console.error('API health check failed:', healthCheck);
          throw new Error('API server is not responding. Please try again later or contact support.');
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
        
        // Prepare job data with the correct field names to match backend schema
        const jobData = {
          title: formData.title,
          company: formData.companyName,
          location: formData.location,
          job_type: formData.employmentType || 'full-time',
          description: formData.description,
          salary: formData.salary || '',
          experience_required: formData.experience || '',
          banner_image_url: bannerUrl,
          contact_email: user?.email || '',
          is_published: true
        };
        
        console.log("Submitting job data:", jobData);
        
        // Try using the job service first
        try {
          const result = await createJobListing(jobData);
          handleSuccess(result);
          
          // Redirect to job listings after short delay
          setTimeout(() => {
            navigate('/my-listings');
          }, 2000);
          return; // Exit if successful
        } catch (serviceError) {
          console.error('Error creating job:', serviceError);
          
          // Try fallback approach if the service fails
          console.log('Trying fallback approach for job creation...');
          
          const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
          
          // Try direct endpoint with job_listings table name
          try {
            const response = await fetch(`${backendUrl}/api/jobs`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify(jobData)
            });
            
            if (response.ok) {
              const result = await response.json();
              handleSuccess(result.data);
              
              // Redirect to job listings after short delay
              setTimeout(() => {
                navigate('/my-listings');
              }, 2000);
              return; // Exit if successful
            }
            
            // If response is not ok, try to get error info
            let errorMessage;
            try {
              const errorData = await response.json();
              errorMessage = errorData.error || `Server returned ${response.status}`;
            } catch (parseError) {
              errorMessage = `Server returned ${response.status}`;
            }
            throw new Error(errorMessage);
          } catch (fallbackError) {
            // Propagate the fallback error
            throw fallbackError;
          }
        }
      } 
      else if (adType === 'car') {
        // Car listing validation and submission
        if (!formData.make || !formData.model || !formData.year || !formData.price) {
          throw new Error('Please fill in all required fields.');
        }
        
        // Show placeholder message for now
        setSuccess(true);
        setTimeout(() => {
          navigate('/my-listings');
        }, 2000);
      } 
      else if (adType === 'item') {
        // Item listing validation
        if (!formData.name || !formData.category || !formData.price) {
          throw new Error('Please fill in all required fields.');
        }
        
        // Show placeholder message for now
        setSuccess(true);
        setTimeout(() => {
          navigate('/my-listings');
        }, 2000);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render job form with updated styling to match JobListingForm
  const renderJobForm = () => {
    return (
      <>
        <div className="form-group">
          <label htmlFor="title">Job Title*</label>
          <input 
            type="text" 
            id="title" 
            name="title" 
            value={formData.title || ''} 
            onChange={handleInputChange} 
            required 
            disabled={!canCreateJobListing}
            placeholder="e.g., Senior Software Developer"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="companyName">Company Name*</label>
          <input 
            type="text" 
            id="companyName" 
            name="companyName" 
            value={formData.companyName || ''} 
            onChange={handleInputChange}
            readOnly={isCompany && user?.company_name}
            className={isCompany && user?.company_name ? "prefilled" : ""}
            disabled={!canCreateJobListing}
            required 
          />
          {isCompany && user?.company_name && (
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
            value={formData.location || ''} 
            onChange={handleInputChange} 
            required 
            disabled={!canCreateJobListing}
            placeholder="e.g., New York, NY or Remote"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="employmentType">Employment Type*</label>
          <select 
            id="employmentType" 
            name="employmentType" 
            value={formData.employmentType || ''} 
            onChange={handleInputChange} 
            required
            disabled={!canCreateJobListing}
          >
            <option value="">Select Employment Type</option>
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
            value={formData.salary || ''} 
            onChange={handleInputChange} 
            required
            disabled={!canCreateJobListing}
            placeholder="e.g., $50,000 - $70,000 per year"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="experience">Experience Required*</label>
          <select
            id="experience"
            name="experience"
            value={formData.experience || ''}
            onChange={handleInputChange}
            required
            disabled={!canCreateJobListing}
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
              value={formData.description || ''}
              onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
              modules={modules}
              formats={formats}
              placeholder="Describe the job responsibilities, qualifications, and other relevant details..."
              required
              disabled={!canCreateJobListing}
            />
            {!canCreateJobListing && (
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
            disabled={!canCreateJobListing}
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
            onClick={handleSubmit}
            disabled={isSubmitting || !canCreateJobListing}
          >
            {isSubmitting ? 'Submitting...' : 'Post Job Listing'}
          </button>
        </div>
        
        {!canCreateJobListing && isCompany && (
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
      </>
    );
  };
  
  return (
    <div className="create-ad-container">
      <h1>Create New Listing</h1>
      
      <div className="ad-type-selector">
        <label htmlFor="adType">Select Listing Type:</label>
        <select 
          id="adType" 
          value={adType} 
          onChange={handleAdTypeChange}
          className="ad-type-dropdown"
        >
          {/* Only show job option if user is a verified company */}
          {canCreateJobListing && (
            <option value="job">Job Listing</option>
          )}
          <option value="house">House Listing</option>
          <option value="car">Car Listing</option>
          <option value="item">Item Listing</option>
        </select>
      </div>
      
      {adType === 'job' && !canCreateJobListing && (
        <div className="warning-message">
          Only verified companies can post job listings. Please complete company verification first.
        </div>
      )}
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">Your {adType} listing was created successfully!</div>}
      
      {/* Render the appropriate form based on ad type */}
      {adType === 'house' ? (
        <HouseListingForm onSuccess={handleSuccess} />
      ) : (
        <form onSubmit={handleSubmit} className="create-ad-form">
          {adType === 'house' ? (
            <div className="redirect-message">
              <p>We've improved our house listing form to provide a better experience.</p>
              <button 
                type="button" 
                className="redirect-button" 
                onClick={handleNavigateToHouseListing}
              >
                Continue to House Listing Form
              </button>
            </div>
          ) : (
            // Render other form types normally
            <>
              {adType === 'job' && renderJobForm()}
              
              {adType === 'car' && (
                <>
                  <div className="form-group">
                    <label htmlFor="make">Make*</label>
                    <input 
                      type="text" 
                      id="make" 
                      name="make" 
                      value={formData.make || ''} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="model">Model*</label>
                    <input 
                      type="text" 
                      id="model" 
                      name="model" 
                      value={formData.model || ''} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="year">Year*</label>
                    <input 
                      type="number" 
                      id="year" 
                      name="year" 
                      value={formData.year || ''} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="price">Price*</label>
                    <input 
                      type="number" 
                      id="price" 
                      name="price" 
                      value={formData.price || ''} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="color">Color*</label>
                    <input 
                      type="text" 
                      id="color" 
                      name="color" 
                      value={formData.color || ''} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="mileage">Mileage*</label>
                    <input 
                      type="number" 
                      id="mileage" 
                      name="mileage" 
                      value={formData.mileage || ''} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="fuelType">Fuel Type</label>
                    <select
                      id="fuelType" 
                      name="fuelType" 
                      value={formData.fuelType || ''} 
                      onChange={handleInputChange}
                    >
                      <option value="">Select Fuel Type</option>
                      <option value="Gasoline">Gasoline</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Electric">Electric</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Plugin Hybrid">Plugin Hybrid</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="description">Description*</label>
                    <textarea 
                      id="description" 
                      name="description" 
                      value={formData.description || ''} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                  
                  <div className="form-actions">
                    <button 
                      type="submit" 
                      className="submit-button" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Submitting...' : 'Post Car Listing'}
                    </button>
                  </div>
                </>
              )}
              
              {adType === 'item' && (
                <>
                  <div className="form-group">
                    <label htmlFor="name">Item Name*</label>
                    <input 
                      type="text" 
                      id="name" 
                      name="name" 
                      value={formData.name || ''} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="category">Category*</label>
                    <select 
                      id="category" 
                      name="category" 
                      value={formData.category || ''} 
                      onChange={handleInputChange} 
                      required
                    >
                      <option value="">Select Category</option>
                      <option value="electronics">Electronics</option>
                      <option value="furniture">Furniture</option>
                      <option value="clothing">Clothing</option>
                      <option value="books">Books</option>
                      <option value="sports">Sports & Outdoors</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="condition">Condition*</label>
                    <select 
                      id="condition" 
                      name="condition" 
                      value={formData.condition || ''} 
                      onChange={handleInputChange} 
                      required
                    >
                      <option value="">Select Condition</option>
                      <option value="new">New</option>
                      <option value="like-new">Like New</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="price">Price*</label>
                    <input 
                      type="text" 
                      id="price" 
                      name="price" 
                      value={formData.price || ''} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="location">Location*</label>
                    <input 
                      type="text" 
                      id="location" 
                      name="location" 
                      value={formData.location || ''} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="description">Description*</label>
                    <textarea 
                      id="description" 
                      name="description" 
                      value={formData.description || ''} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                  
                  <div className="form-actions">
                    <button 
                      type="submit" 
                      className="submit-button" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Submitting...' : 'Post Item Listing'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </form>
      )}
    </div>
  );
};

export default CreateAd;