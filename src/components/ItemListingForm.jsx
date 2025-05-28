import React, { useState, useEffect, useRef } from 'react';
import 'react-quill/dist/quill.snow.css';
import { useNavigate } from 'react-router-dom';
import './ItemListingForm.css';
import RichTextEditor from './common/RichTextEditor';

const ItemListingForm = ({ onSuccess, user }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    condition: 'new',
    imageUrl: '',
    imageUrls: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // First, upload images if any
      let uploadedImageUrls = [];
      
      if (imageFiles.length > 0) {
        const formData = new FormData();
        imageFiles.forEach(file => {
          formData.append('images', file);
        });
        
        const imageUploadResponse = await fetch('/api/upload/items', {
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
      
      // Now submit the item data
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          is_published: true,
          image_url: uploadedImageUrls[0] || '',
          image_urls: uploadedImageUrls
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create item listing');
      }
      
      // Clean up preview URLs
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      
      // Success handler
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/my-listings');
      }
    } catch (err) {
      console.error('Error creating item listing:', err);
      setError(err.message || 'An error occurred while creating the listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="item-listing-form-container">
      <h1>Add New Item</h1>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="item-listing-form">
        <div className="form-group">
          <label htmlFor="name">Item Name*</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="category">Category*</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          >
            <option value="">Select a category</option>
            <option value="electronics">Electronics</option>
            <option value="furniture">Furniture</option>
            <option value="clothing">Clothing</option>
            <option value="sports">Sports & Outdoors</option>
            <option value="toys">Toys & Games</option>
            <option value="books">Books & Media</option>
            <option value="tools">Tools & Home Improvement</option>
            <option value="beauty">Beauty & Personal Care</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="condition">Condition*</label>
          <select
            id="condition"
            name="condition"
            value={formData.condition}
            onChange={handleChange}
            required
          >
            <option value="new">New</option>
            <option value="like-new">Like New</option>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="price">Price ($)*</label>
          <input
            type="number"
            id="price"
            name="price"
            min="0"
            step="0.01"
            value={formData.price}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description*</label>
          <RichTextEditor 
            value={formData.description}
            onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
            placeholder="Provide details about the item's condition, features, etc."
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="images">Item Images</label>
          <input
            type="file"
            id="images"
            accept="image/*"
            multiple
            onChange={handleImageChange}
          />
          <p className="form-hint">Select multiple images to showcase your item from different angles.</p>
          
          {previewUrls.length > 0 && (
            <div className="image-preview-section">
              <h4>Selected Images ({previewUrls.length})</h4>
              <div className="image-preview-container">
                {previewUrls.map((url, index) => (
                  <div key={index} className="image-preview">
                    <img 
                      src={url} 
                      alt={`Preview ${index + 1}`} 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/placeholder-image.jpg';
                      }}
                    />
                    <button 
                      type="button" 
                      className="remove-image-btn"
                      onClick={() => removeImage(index)}
                      aria-label="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
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
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Listing'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ItemListingForm;
