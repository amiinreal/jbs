import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './EditHouseListing.css';
import RichTextEditor from './common/RichTextEditor';

const EditHouseListing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    address: '',
    price: '',
    description: '',
    number_of_bedrooms: '',
    number_of_bathrooms: '',
    square_footage: '',
    is_published: false,
    primary_image_id: null
  });
  const [images, setImages] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Add state for multiple images
  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  // Fetch house listing details
  useEffect(() => {
    const fetchHouseDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/houses/${id}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch house details: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success || !data.data) {
          throw new Error('Failed to load house details');
        }
        
        const house = data.data;
        
        setFormData({
          title: house.title || '',
          address: house.address || '',
          price: house.price || '',
          description: house.description || '',
          number_of_bedrooms: house.number_of_bedrooms || 1,
          number_of_bathrooms: house.number_of_bathrooms || 1,
          square_footage: house.square_footage || '',
          is_published: house.is_published || false,
          image_url: house.image_url || '',
          image_urls: house.image_urls || [],
        });
        
        // Set existing images
        if (house.image_url) {
          setExistingImages([house.image_url]);
        }
        
        if (house.image_urls && Array.isArray(house.image_urls)) {
          setExistingImages(house.image_urls);
        }
        
        // Fetch image preview if available
        if (house.primary_image_id) {
          try {
            const imageUrl = `/api/files/${house.primary_image_id}`;
            setPreviewImages([imageUrl]);
          } catch (imgErr) {
            console.warn('Error fetching image:', imgErr);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching house listing:', err);
        setError(err.message || 'Failed to load house details');
        setLoading(false);
      }
    };

    if (id) {
      fetchHouseDetails();
    }
  }, [id]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
    
    // Create preview URLs
    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
    
    // Clean up old preview URLs to avoid memory leaks
    previewImages.forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    
    setPreviewImages(newPreviewUrls);
  };

  // Add image handling functions
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles(prevFiles => [...prevFiles, ...files]);
    
    // Create preview URLs
    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(prevUrls => [...prevUrls, ...newPreviewUrls]);
  };

  const removeImage = (index) => {
    setImageFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    
    // Revoke the URL to prevent memory leaks
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls(prevUrls => prevUrls.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index) => {
    setExistingImages(prevImages => prevImages.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Upload images if any are selected
      let uploadedImageUrls = [];
      
      if (imageFiles.length > 0) {
        const imageFormData = new FormData();
        imageFiles.forEach(file => {
          imageFormData.append('images', file);
        });
        
        const imageUploadResponse = await fetch('/api/upload/houses', {
          method: 'POST',
          credentials: 'include',
          body: imageFormData
        });
        
        if (!imageUploadResponse.ok) {
          const errorData = await imageUploadResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to upload images');
        }
        
        const imageData = await imageUploadResponse.json();
        uploadedImageUrls = imageData.urls || [];
      }
      
      // Combine existing and new images
      const allImageUrls = [...existingImages, ...uploadedImageUrls];
      
      // Now update house data
      const response = await fetch(`/api/houses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          title: formData.title,
          address: formData.address,
          price: formData.price,
          description: formData.description,
          number_of_bedrooms: formData.number_of_bedrooms,
          number_of_bathrooms: formData.number_of_bathrooms,
          square_footage: formData.square_footage,
          is_published: formData.is_published,
          image_url: existingImages[0] || '',
          image_urls: existingImages
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update house listing (${response.status})`);
      }
      
      setSuccessMessage('House listing updated successfully!');
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/my-house-listings');
      }, 2000);
      
    } catch (err) {
      console.error('Error updating house listing:', err);
      setError(err.message || 'Failed to update listing');
    } finally {
      // Clean up preview URLs
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading house details...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/my-house-listings')}>Back to My Listings</button>
      </div>
    );
  }

  return (
    <div className="edit-house-container">
      <h1>Edit House Listing</h1>
      
      {successMessage && <div className="success-message">{successMessage}</div>}
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="house-form">
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Enter a descriptive title for your listing"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="address">Address *</label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            required
            placeholder="Full property address"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="price">Price</label>
          <input
            type="number"
            id="price"
            name="price"
            value={formData.price}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="number_of_bedrooms">Bedrooms</label>
            <input
              type="number"
              id="number_of_bedrooms"
              name="number_of_bedrooms"
              value={formData.number_of_bedrooms}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="number_of_bathrooms">Bathrooms</label>
            <input
              type="number"
              id="number_of_bathrooms"
              name="number_of_bathrooms"
              value={formData.number_of_bathrooms}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="square_footage">Square Footage</label>
          <input
            type="number"
            id="square_footage"
            name="square_footage"
            value={formData.square_footage}
            onChange={handleInputChange}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <RichTextEditor
            value={formData.description}
            onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
            placeholder="Describe the property..."
          />
        </div>
        
        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              name="is_published"
              checked={formData.is_published}
              onChange={handleInputChange}
            />
            Publish this listing
          </label>
        </div>
        
        <div className="form-group">
          <label>House Images</label>
          
          {/* Display existing images */}
          {existingImages.length > 0 && (
            <div className="existing-images">
              <h4>Current Images</h4>
              <div className="image-preview-container">
                {existingImages.map((url, index) => (
                  <div key={`existing-${index}`} className="image-preview">
                    <img src={url} alt={`House ${index}`} />
                    <button 
                      type="button" 
                      className="remove-image-btn"
                      onClick={() => removeExistingImage(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Upload new images */}
          <div className="new-images">
            <h4>Add New Images</h4>
            <input
              type="file"
              id="images"
              accept="image/*"
              multiple
              onChange={handleImageChange}
            />
            
            {previewUrls.length > 0 && (
              <div className="image-preview-container">
                {previewUrls.map((url, index) => (
                  <div key={`new-${index}`} className="image-preview">
                    <img src={url} alt={`Preview ${index}`} />
                    <button 
                      type="button" 
                      className="remove-image-btn"
                      onClick={() => removeImage(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="form-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={() => navigate('/my-house-listings')}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          
          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating...' : 'Update Listing'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditHouseListing;
