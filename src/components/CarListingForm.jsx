import React, { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useNavigate } from 'react-router-dom';
import './CarListingForm.css';

const CarListingForm = ({ onSuccess, user }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
    price: '',
    color: '',
    mileage: '',
    fuel_type: '',
    description: '',
    is_published: true
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
        
        const imageUploadResponse = await fetch('/api/upload/cars', {
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
      
      // Now submit the car data
      const response = await fetch('/api/cars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          image_url: uploadedImageUrls[0] || '',
          image_urls: uploadedImageUrls
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create car listing');
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
      console.error('Error creating car listing:', err);
      setError(err.message || 'An error occurred while creating the listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get current year for the year dropdown
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

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
    <div className="car-listing-form-container">
      <h1>Add a Car Listing</h1>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="car-listing-form">
        <div className="form-group">
          <label htmlFor="make">Make*</label>
          <input
            type="text"
            id="make"
            name="make"
            value={formData.make}
            onChange={handleChange}
            required
            placeholder="e.g., Toyota, Honda, Ford"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="model">Model*</label>
          <input
            type="text"
            id="model"
            name="model"
            value={formData.model}
            onChange={handleChange}
            required
            placeholder="e.g., Camry, Civic, F-150"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="year">Year*</label>
          <select
            id="year"
            name="year"
            value={formData.year}
            onChange={handleChange}
            required
          >
            <option value="">Select Year</option>
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
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
          <label htmlFor="color">Color*</label>
          <input
            type="text"
            id="color"
            name="color"
            value={formData.color}
            onChange={handleChange}
            required
            placeholder="e.g., Black, Silver, White"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="mileage">Mileage*</label>
          <input
            type="number"
            id="mileage"
            name="mileage"
            min="0"
            value={formData.mileage}
            onChange={handleChange}
            required
            placeholder="Enter mileage in miles"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="fuel_type">Fuel Type*</label>
          <select
            id="fuel_type"
            name="fuel_type"
            value={formData.fuel_type}
            onChange={handleChange}
            required
          >
            <option value="">Select Fuel Type</option>
            <option value="gasoline">Gasoline</option>
            <option value="diesel">Diesel</option>
            <option value="electric">Electric</option>
            <option value="hybrid">Hybrid</option>
            <option value="plugin_hybrid">Plug-in Hybrid</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description*</label>
          <div className="rich-text-editor-container">
            <ReactQuill
              theme="snow"
              value={formData.description}
              onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
              modules={modules}
              formats={formats}
              placeholder="Provide details about the car's condition, features, history, etc."
              required
            />
          </div>
          <p className="editor-hint">
            Use the toolbar to format your description with headers, bullet points, and more.
          </p>
        </div>
        
        <div className="form-group">
          <label htmlFor="images">Car Images</label>
          <input
            type="file"
            id="images"
            accept="image/*"
            multiple
            onChange={handleImageChange}
          />
          <p className="form-hint">Upload multiple images of the car (exterior, interior, etc.)</p>
          
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

export default CarListingForm;
