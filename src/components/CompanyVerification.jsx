import React, { useState } from 'react';

const CompanyVerification = () => {
  const [formData, setFormData] = useState({
    company_name: '',
    company_description: '',
    business_license_number: '',
    contact_email: '',
    contact_phone: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/company-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'An error occurred while submitting your verification request.');
      }
      
      setMessage(data.message);
      // Reset form after successful submission
      setFormData({
        company_name: '',
        company_description: '',
        business_license_number: '',
        contact_email: '',
        contact_phone: ''
      });
    } catch (err) {
      setError(err.message || 'An error occurred while submitting your verification request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="company-verification-container">
      <h2>Company Verification</h2>
      <p className="info-text">
        To post job listings, your company needs to be verified. Please complete the form below to apply for verification.
      </p>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="verification-form">
        <div className="form-group">
          <label htmlFor="company_name">Company Name *</label>
          <input
            type="text"
            id="company_name"
            name="company_name"
            value={formData.company_name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="company_description">Company Description</label>
          <textarea
            id="company_description"
            name="company_description"
            value={formData.company_description}
            onChange={handleChange}
            rows="4"
          />
        </div>

        <div className="form-group">
          <label htmlFor="business_license_number">Business License Number *</label>
          <input
            type="text"
            id="business_license_number"
            name="business_license_number"
            value={formData.business_license_number}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="contact_email">Contact Email *</label>
          <input
            type="email"
            id="contact_email"
            name="contact_email"
            value={formData.contact_email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="contact_phone">Contact Phone</label>
          <input
            type="tel"
            id="contact_phone"
            name="contact_phone"
            value={formData.contact_phone}
            onChange={handleChange}
          />
        </div>

        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Verification Request'}
        </button>
      </form>

      <div className="verification-note">
        <p>Note: Verification requests are typically processed within 1-3 business days.</p>
        <p>Only verified companies can post job listings, but all users can post other types of listings.</p>
      </div>
    </div>
  );
};

export default CompanyVerification;