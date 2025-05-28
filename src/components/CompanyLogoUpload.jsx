import React from 'react';
import ImageUpload from './ImageUpload';
import './CompanyLogoUpload.css';

const CompanyLogoUpload = ({ existingLogo, onLogoUpdated }) => {
  const handleLogoUpload = async (logoPath) => {
    try {
      // Make API call to update user's company logo
      const response = await fetch('/api/uploads/logo/company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ logo_url: logoPath })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update company logo');
      }
      
      const data = await response.json();
      
      // Notify parent component about the logo update
      onLogoUpdated(data.logo.path);
      
    } catch (error) {
      console.error('Error updating company logo:', error);
      // You might want to show an error message here
    }
  };

  return (
    <div className="company-logo-upload">
      <h3>Company Logo</h3>
      <p>Upload your company logo to display on your profile and job listings</p>
      
      <div className="logo-upload-container">
        <ImageUpload 
          type="logo"
          multiple={false}
          onImageUploaded={handleLogoUpload}
          existingImage={existingLogo}
        />
      </div>
      
      <div className="logo-guidelines">
        <h4>Logo Guidelines</h4>
        <ul>
          <li>Upload a square image for best results</li>
          <li>Minimum size: 200x200 pixels</li>
          <li>Maximum file size: 5MB</li>
          <li>Supported formats: JPG, PNG, GIF, WebP</li>
        </ul>
      </div>
    </div>
  );
};

export default CompanyLogoUpload;
