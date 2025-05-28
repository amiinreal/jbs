import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import './HouseDetail.css';
import { getImageUrl, getImageUrls, getPlaceholderImage } from '../utils/fileUtils';

const HouseDetail = ({ isAuthenticated, currentUser }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [house, setHouse] = useState(null);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [messageSending, setMessageSending] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchHouseDetail = async () => {
      try {
        setLoading(true);
        console.log(`Fetching house with ID: ${id}`);
        
        // Use public endpoint to avoid authentication issues
        const response = await fetch(`/api/houses/public/${id}`);
        
        if (!response.ok) {
          console.error(`Error response status: ${response.status}`);
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('House data received:', data);
        
        if (!data.data) {
          throw new Error('House listing not found');
        }
        
        // Process the house data
        const houseData = data.data;
        
        // Ensure image_urls is always an array
        if (!houseData.image_urls) {
          houseData.image_urls = [];
        } else if (!Array.isArray(houseData.image_urls)) {
          try {
            if (typeof houseData.image_urls === 'string') {
              const parsed = JSON.parse(houseData.image_urls);
              houseData.image_urls = Array.isArray(parsed) ? parsed : [houseData.image_urls];
            } else {
              houseData.image_urls = [houseData.image_urls];
            }
          } catch (e) {
            console.error('Failed to parse image_urls:', e);
            houseData.image_urls = [houseData.image_urls];
          }
        }
        
        // Add image_url to image_urls if it exists and not already included
        if (houseData.image_url && !houseData.image_urls.includes(houseData.image_url)) {
          houseData.image_urls.push(houseData.image_url);
        }
        
        // Add primary_image_url to image_urls if it exists
        if (houseData.primary_image_url && !houseData.image_urls.includes(houseData.primary_image_url)) {
          houseData.image_urls.unshift(houseData.primary_image_url);
        }
        
        setHouse(houseData);
        
        // Fetch seller information if available
        if (houseData.user_id) {
          try {
            const sellerResponse = await fetch(`/api/users/${houseData.user_id}/public`);
            if (sellerResponse.ok) {
              const sellerData = await sellerResponse.json();
              setSeller(sellerData.data);
            }
          } catch (sellerErr) {
            console.warn('Could not fetch seller info:', sellerErr);
          }
        }
      } catch (err) {
        console.error('Error fetching house details:', err);
        setError('Failed to load house details. The listing may have been removed or is unavailable.');
      } finally {
        setLoading(false);
      }
    };

    fetchHouseDetail();
  }, [id]);

  const handleContactClick = () => {
    if (!isAuthenticated) {
      // Save current location to redirect back after login
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      navigate('/login', { 
        state: { 
          message: 'Please sign in to contact the seller',
          returnPath: window.location.pathname 
        }
      });
      return;
    }
    
    setContactModalOpen(true);
  };
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!messageContent.trim() || !house) {
      return;
    }
    
    try {
      setMessageSending(true);
      
      // Create a message object with detailed listing information
      const messageData = {
        recipient_id: house.user_id,
        content: messageContent,
        subject: `Inquiry about your house listing: ${house.address}`,
        listing_id: house.id,
        listing_type: 'house',
        listing_details: {
          title: house.address,
          price: house.price,
          image_url: getImageUrl(house),
          listing_url: window.location.href
        }
      };
      
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(messageData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }
      
      setMessageContent('');
      setMessageSent(true);
      
      // Close modal after showing success for 2 seconds
      setTimeout(() => {
        setContactModalOpen(false);
        setMessageSent(false);
      }, 2000);
      
    } catch (err) {
      console.error('Error sending message:', err);
      alert(`Failed to send message: ${err.message}`);
    } finally {
      setMessageSending(false);
    }
  };

  // Function to change the selected image
  const handleImageSelect = (index) => {
    setSelectedImageIndex(index);
  };

  // Add a function to navigate between images
  const handleImageNavigation = (direction) => {
    const allImages = getImageUrls(house);
    if (direction === 'prev') {
      setSelectedImageIndex(prev => 
        prev === 0 ? allImages.length - 1 : prev - 1
      );
    } else {
      setSelectedImageIndex(prev => 
        prev === allImages.length - 1 ? 0 : prev + 1
      );
    }
  };

  // Add functions for image navigation
  const nextImage = () => {
    if (house?.image_urls && house.image_urls.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === house.image_urls.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (house?.image_urls && house.image_urls.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? house.image_urls.length - 1 : prev - 1
      );
    }
  };

  if (loading) {
    return (
      <div className="house-detail-loading">
        <div className="loading-spinner"></div>
        <p>Loading property details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="house-detail-error">
        <h2>Oops! Something went wrong</h2>
        <p>{error}</p>
        <Link to="/houses" className="back-button">Back to Listings</Link>
      </div>
    );
  }

  if (!house) {
    return (
      <div className="house-detail-error">
        <h2>Listing Not Found</h2>
        <p>The house listing you're looking for doesn't exist or has been removed.</p>
        <Link to="/houses" className="back-button">Back to Listings</Link>
      </div>
    );
  }

  const isOwner = currentUser && house.user_id === currentUser.id;
  const allImages = getImageUrls(house);
  const mainImageUrl = allImages.length > 0 ? allImages[selectedImageIndex] : getPlaceholderImage('house');

  return (
    <div className="house-detail-container">
      <div className="house-detail-breadcrumb">
        <Link to="/houses">Houses</Link> / {house.title || house.address || 'Property Details'}
      </div>
      
      <div className="house-detail-content">
        <div className="house-detail-main">
          <div className="house-detail-gallery">
            <div className="gallery-main-container">
              <img src={mainImageUrl} alt={house.address} className="main-image" />
              
              {allImages.length > 1 && (
                <>
                  <button 
                    className="gallery-nav-button prev" 
                    onClick={() => handleImageNavigation('prev')}
                  >
                    &lsaquo;
                  </button>
                  <button 
                    className="gallery-nav-button next" 
                    onClick={() => handleImageNavigation('next')}
                  >
                    &rsaquo;
                  </button>
                  <div className="image-counter">
                    {selectedImageIndex + 1} / {allImages.length}
                  </div>
                </>
              )}
            </div>
            
            {allImages.length > 1 && (
              <div className="image-thumbnails">
                {allImages.map((url, index) => (
                  <div 
                    key={index} 
                    className={`thumbnail ${index === selectedImageIndex ? 'active' : ''}`}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <img src={url} alt={`${house.address} - view ${index + 1}`} />
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="house-detail-info">
            {/* Display title if available, otherwise address */}
            {house.title && <h1 className="house-title">{house.title}</h1>}
            
            {/* Always show the full address */}
            <p className="house-address">{house.address}</p>
            
            <div className="house-price">
              ${house.price?.toLocaleString() || 'Price on request'}
            </div>
            
            <div className="house-key-details">
              <div className="detail-item">
                <span className="detail-icon">🛏️</span>
                <span className="detail-value">{house.number_of_bedrooms} Bedrooms</span>
              </div>
              <div className="detail-item">
                <span className="detail-icon">🚿</span>
                <span className="detail-value">{house.number_of_bathrooms} Bathrooms</span>
              </div>
              <div className="detail-item">
                <span className="detail-icon">📏</span>
                <span className="detail-value">{house.square_footage?.toLocaleString() || 'N/A'} sq ft</span>
              </div>
            </div>
            
            <div className="house-description">
              <h3>Description</h3>
              <div 
                className="rich-text-content"
                dangerouslySetInnerHTML={{ __html: house.description || 'No description provided.' }}
              />
            </div>
          </div>
        </div>
        
        <div className="house-detail-sidebar">
          <div className="contact-card">
            <h3>Contact Information</h3>
            
            {seller ? (
              <div className="seller-info">
                <p className="seller-name">{seller.company_name || seller.username}</p>
                {isAuthenticated && seller.email && (
                  <p className="seller-email">{seller.email}</p>
                )}
              </div>
            ) : (
              <p>Seller information unavailable</p>
            )}
            
            {!isOwner && (
              <button 
                className="contact-button" 
                onClick={handleContactClick}
                disabled={!seller}
              >
                {isAuthenticated ? 'Message Seller' : 'Sign in to Message'}
              </button>
            )}
            
            {isOwner && (
              <div className="owner-actions">
                <p className="owner-note">This is your listing</p>
                <Link to={`/edit-house-listing/${house.id}`} className="edit-listing-button">
                  Edit Listing
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {contactModalOpen && (
        <div className="message-modal">
          <div className="message-modal-content">
            <span className="close-modal" onClick={() => setContactModalOpen(false)}>&times;</span>
            
            <h3>Send Message to {seller?.company_name || seller?.username}</h3>
            
            {messageSent ? (
              <div className="message-sent">
                <div className="success-icon">✓</div>
                <p>Message sent successfully!</p>
              </div>
            ) : (
              <form onSubmit={handleSendMessage}>
                <div className="form-group">
                  <label>Subject</label>
                  <input 
                    type="text" 
                    value={`Inquiry about: ${house.address}`} 
                    disabled 
                  />
                </div>
                
                <div className="form-group">
                  <label>Message</label>
                  <textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="I'm interested in this property and would like to know more..."
                    rows={5}
                    required
                  />
                </div>
                
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="cancel-button"
                    onClick={() => setContactModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="send-button"
                    disabled={messageSending || !messageContent.trim()}
                  >
                    {messageSending ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HouseDetail;
