import React, { useState, useEffect } from 'react';
import './HouseListingForm.css';
import ImageUpload from './ImageUpload';
import RichTextEditor from './common/RichTextEditor';

const HouseListingForm = ({ onSuccess, existingListing = null }) => {
  // Initialize form state with existing data or defaults, adding the title field
  const [formData, setFormData] = useState({
    title: existingListing?.title || '',
    address: existingListing?.address || '',
    price: existingListing?.price || '',
    description: existingListing?.description || '',
    number_of_bedrooms: existingListing?.number_of_bedrooms || 1,
    number_of_bathrooms: existingListing?.number_of_bathrooms || 1,
    square_footage: existingListing?.square_footage || '',
    is_published: existingListing?.is_published || false,
    image_url: existingListing?.image_url || '',
    image_urls: existingListing?.image_urls || [],
    primaryImageId: existingListing?.primary_image_id || null,
    additionalImageIds: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Add state for multiple images
  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  
  // Fetch additional images if editing an existing listing
  useEffect(() => {
    if (existingListing?.id) {
      // Fetch the additional images for this house
      fetch(`/api/houses/${existingListing.id}/images`)
        .then(response => response.json())
        .then(data => {
          if (data.success && data.fileIds) {
            setFormData(prev => ({
              ...prev,
              additionalImageIds: data.fileIds
            }));
          }
        })
        .catch(error => {
          console.error('Error fetching additional images:', error);
        });
    }
  }, [existingListing]);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  // Handle primary image upload
  const handlePrimaryImageUploaded = (fileId) => {
    setFormData({
      ...formData,
      primaryImageId: fileId
    });
  };
  
  // Handle additional images upload
  const handleAdditionalImagesUploaded = (fileIds) => {
    setFormData({
      ...formData,
      additionalImageIds: fileIds
    });
  };
  
  // Update the image handling functions
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
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Convert numeric fields from strings to numbers
      const dataToSend = {
        ...formData,
        price: formData.price ? Number(formData.price) : null,
        number_of_bedrooms: Number(formData.number_of_bedrooms),
        number_of_bathrooms: Number(formData.number_of_bathrooms),
        square_footage: formData.square_footage ? Number(formData.square_footage) : null
      };
      
      // First, upload images if any
      let uploadedImageUrls = [];
      
      if (imageFiles.length > 0) {
        const formData = new FormData();
        imageFiles.forEach(file => {
          formData.append('images', file);
        });
        
        const imageUploadResponse = await fetch('/api/upload/houses', {
          method: 'POST',
          credentials: 'include',
          body: formData
        });
        
        if (!imageUploadResponse.ok) {
          throw new Error('Failed to upload images');
        }
        
        const imageData = await imageUploadResponse.json();
        uploadedImageUrls = imageData.urls || [];
      }
      
      const url = existingListing 
        ? `/api/houses/${existingListing.id}` 
        : '/api/houses';
      
      const method = existingListing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...dataToSend,
          image_url: uploadedImageUrls[0] || '',
          image_urls: uploadedImageUrls
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save listing');
      }
      
      setSuccess(true);
      if (onSuccess) {
        onSuccess(result.data);
      }
      
      // Clear form if creating a new listing
      if (!existingListing) {
        setFormData({
          title: '',
          address: '',
          price: '',
          description: '',
          number_of_bedrooms: 1,
          number_of_bathrooms: 1,
          square_footage: '',
          is_published: false,
        });
      }
      
      // Clear success message after delay
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error saving house listing:', err);
      setError(err.message);
    } finally {
      // Clean up preview URLs
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setLoading(false);
    }
  };
  
  return (
    <div className="house-listing-form-container">
      <h2>{existingListing ? 'Edit House Listing' : 'Add New House Listing'}</h2>
      
      <form onSubmit={handleSubmit} className="house-listing-form">
        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter a descriptive title for your listing"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="address">Address *</label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Full address"
            required
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="price">Price ($)</label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="Price in USD"
              min="0"
              step="1000"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="square_footage">Square Footage</label>
            <input
              type="number"
              id="square_footage"
              name="square_footage"
              value={formData.square_footage}
              onChange={handleChange}
              placeholder="Size in sq ft"
              min="0"
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="number_of_bedrooms">Bedrooms</label>
            <select
              id="number_of_bedrooms"
              name="number_of_bedrooms"
              value={formData.number_of_bedrooms}
              onChange={handleChange}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="number_of_bathrooms">Bathrooms</label>
            <select
              id="number_of_bathrooms"
              name="number_of_bathrooms"
              value={formData.number_of_bathrooms}
              onChange={handleChange}
            >
              {[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <RichTextEditor 
            value={formData.description}
            onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
            placeholder="Describe the property..."
          />
        </div>
        
        {/* Publication toggle with visual switch */}
        <div className="form-group publication-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              name="is_published"
              checked={formData.is_published}
              onChange={handleChange}
            />
            <span className="toggle-switch"></span>
            <span className="toggle-text">
              {formData.is_published ? 'Published - Visible to everyone' : 'Unpublished - Only visible to you'}
            </span>
          </label>
          <p className="toggle-help-text">
            {formData.is_published 
              ? 'Your listing will be immediately visible in search results.' 
              : 'Save as unpublished to finish details later.'}
          </p>
        </div>
        
        {/* Primary Image Upload */}
        <div className="form-group">
          <label>Primary Image</label>
          <ImageUpload 
            entityType={existingListing ? 'house' : null}
            entityId={existingListing?.id}
            isPrimary={true}
            onImageUploaded={handlePrimaryImageUploaded}
            existingFileId={formData.primaryImageId}
          />
        </div>
        
        {/* Additional Images Upload - only available for existing houses */}
        {existingListing?.id && (
          <div className="form-group">
            <label>Additional Images (up to 5)</label>
            <ImageUpload 
              entityType="house"
              entityId={existingListing.id}
              multiple={true}
              maxFiles={5}
              onImageUploaded={handleAdditionalImagesUploaded}
              existingFileIds={formData.additionalImageIds}
            />
          </div>
        )}
        
        <div className="form-group">
          <label htmlFor="images">House Images</label>
          <input
            type="file"
            id="images"
            accept="image/*"
            multiple
            onChange={handleImageChange}
          />
          <p className="form-hint">Upload multiple images of the property (exterior, interior, etc.)</p>
          
          <div className="image-preview-container">
            {previewUrls.map((url, index) => (
              <div key={index} className="image-preview">
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
        </div>
        
        {error && (
          <div className="form-error">
            <p>{error}</p>
          </div>
        )}
        
        {success && (
          <div className="form-success">
            <p>House listing saved successfully!</p>
          </div>
        )}
        
        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-button"
            onClick={() => window.history.back()}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Saving...' : existingListing ? 'Update Listing' : 'Create Listing'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default HouseListingForm;
