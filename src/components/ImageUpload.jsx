import React, { useState, useEffect } from 'react';
import './ImageUpload.css';

const ImageUpload = ({ 
  onImageUploaded, 
  entityType = null,
  entityId = null,
  isPrimary = false,
  multiple = false, 
  maxFiles = 5, 
  existingFileId = null,
  existingFileIds = []
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [filesToUpload, setFilesToUpload] = useState([]);
  const [initialLoad, setInitialLoad] = useState(true);

  // Load existing images on component mount
  useEffect(() => {
    // Only run on initial mount or when dependencies truly change
    if (!initialLoad && !existingFileId && existingFileIds.length === 0) {
      return;
    }

    const loadExistingImages = async () => {
      // Clear existing previews first to avoid duplication
      const newPreviews = [];
      
      // Load primary image if exists
      if (existingFileId) {
        newPreviews.push(`/api/files/${existingFileId}`);
      }
      
      // Load additional images if multiple
      if (multiple && existingFileIds && existingFileIds.length > 0) {
        existingFileIds.forEach(id => {
          if (id) newPreviews.push(`/api/files/${id}`);
        });
      }
      
      // Only update state if there are changes
      if (newPreviews.length > 0) {
        setPreviewUrls(newPreviews);
      }
      
      // Mark initial load complete
      setInitialLoad(false);
    };
    
    loadExistingImages();
  }, [existingFileId, existingFileIds, multiple, initialLoad]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    
    // Validate file types
    const invalidFiles = files.filter(file => 
      !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)
    );
    
    if (invalidFiles.length > 0) {
      setUploadError('Only JPG, PNG, GIF, and WebP images are allowed');
      return;
    }
    
    // Create preview URLs for selected files
    const newPreviews = files.map(file => URL.createObjectURL(file));
    
    if (multiple) {
      // Make sure we don't exceed maxFiles
      if (previewUrls.length + files.length > maxFiles) {
        setUploadError(`You can only upload up to ${maxFiles} images`);
        return;
      }
      
      setPreviewUrls([...previewUrls, ...newPreviews]);
      setFilesToUpload([...filesToUpload, ...files]);
    } else {
      // For single file uploads, replace the existing preview
      setPreviewUrls([newPreviews[0]]);
      setFilesToUpload([files[0]]);
    }
    
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (filesToUpload.length === 0) {
      setUploadError('Please select an image to upload');
      return;
    }
    
    setUploading(true);
    setProgress(0);
    setUploadError(null);
    
    try {
      // Determine endpoint based on whether it's a single or multiple upload
      const endpoint = `/api/upload/${entityType}`;
      
      const formData = new FormData();
      
      // Add entity info if provided
      if (entityType) formData.append('entityType', entityType);
      if (entityId) formData.append('entityId', entityId);
      if (isPrimary) formData.append('isPrimary', 'true');
      
      // Add files to form data
      if (multiple) {
        filesToUpload.forEach(file => {
          formData.append('files', file);
        });
      } else {
        formData.append('file', filesToUpload[0]);
      }
      
      const xhr = new XMLHttpRequest();
      
      // Set up progress tracking
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setProgress(percentComplete);
        }
      });
      
      // Handle response
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          setUploading(false);
          
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              // Check if response is JSON
              const contentType = xhr.getResponseHeader('content-type');
              if (contentType && contentType.includes('application/json')) {
                const response = JSON.parse(xhr.responseText);
                
                if (response.success) {
                  // Call the callback with file information
                  if (multiple) {
                    onImageUploaded(response.fileIds, response.fileUrls);
                  } else {
                    onImageUploaded(response.fileId, response.fileUrl);
                  }
                } else {
                  setUploadError(response.error || 'Upload failed');
                }
              } else {
                console.error('Unexpected content type:', contentType);
                setUploadError('Server returned an unexpected response format');
              }
            } catch (parseError) {
              console.error('Error parsing upload response:', parseError);
              console.error('Response text:', xhr.responseText.substring(0, 200) + '...');
              setUploadError('Failed to process server response');
            }
          } else {
            console.error('Upload failed with status:', xhr.status);
            if (xhr.status === 404) {
              setUploadError('Upload endpoint not found. Contact administrator.');
            } else {
              setUploadError(`Upload failed (${xhr.status})`);
            }
          }
        }
      };
      
      // Send the request with credentials included
      xhr.open('POST', endpoint, true);
      xhr.withCredentials = true;
      xhr.send(formData);
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Failed to upload image');
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    const newPreviews = [...previewUrls];
    newPreviews.splice(index, 1);
    setPreviewUrls(newPreviews);
    
    // Also remove from filesToUpload if it's a newly selected file
    if (index < filesToUpload.length) {
      const newFiles = [...filesToUpload];
      newFiles.splice(index, 1);
      setFilesToUpload(newFiles);
    }
    
    // If the image was already uploaded, call the API to delete it
    if (!multiple && existingFileId && index === 0) {
      deleteFile(existingFileId);
      onImageUploaded(null);
    } else if (multiple && existingFileIds && index < existingFileIds.length) {
      const fileId = existingFileIds[index];
      deleteFile(fileId);
      
      // Update the parent component
      const newFileIds = [...existingFileIds];
      newFileIds.splice(index, 1);
      onImageUploaded(newFileIds);
    }
  };

  // Function to delete file from server
  const deleteFile = async (fileId) => {
    try {
      await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  return (
    <div className="image-upload-container">
      <div className="image-upload-header">
        <h3>{multiple ? 'Upload Images' : 'Upload Image'}</h3>
        <p className="image-upload-info">
          {multiple 
            ? `You can upload up to ${maxFiles} images (JPG, PNG, GIF, WebP)` 
            : 'Upload an image (JPG, PNG, GIF, WebP)'}
        </p>
      </div>
      
      {uploadError && (
        <div className="image-upload-error">
          <p>{uploadError}</p>
        </div>
      )}
      
      <div className="image-previews">
        {previewUrls.map((url, index) => (
          <div className="image-preview-item" key={index}>
            <img src={url} alt={`Preview ${index + 1}`} />
            <button 
              type="button" 
              className="remove-image-btn"
              onClick={() => removeImage(index)}
            >
              ×
            </button>
          </div>
        ))}
        
        {/* Show placeholder if no images */}
        {previewUrls.length === 0 && (
          <div className="image-preview-placeholder">
            <div className="placeholder-icon">📷</div>
            <p>No images selected</p>
          </div>
        )}
      </div>
      
      <div className="image-upload-actions">
        <label className="file-input-label">
          <input
            type="file"
            accept="image/jpeg, image/png, image/gif, image/webp"
            onChange={handleFileChange}
            multiple={multiple}
            disabled={uploading}
          />
          {multiple ? 'Select Images' : 'Select Image'}
        </label>
        
        {filesToUpload.length > 0 && (
          <button
            type="button"
            className="upload-button"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? `Uploading (${progress}%)` : 'Upload'}
          </button>
        )}
      </div>
      
      {uploading && (
        <div className="upload-progress-bar-container">
          <div 
            className="upload-progress-bar" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
