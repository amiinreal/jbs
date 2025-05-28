/**
 * Utility functions for handling file and image operations
 */

/**
 * Gets the primary image URL from a listing object
 * @param {Object} listing - The listing object (house, car, job, item)
 * @returns {string|null} The image URL or null if not found
 */
export const getImageUrl = (listing) => {
  if (!listing) return getPlaceholderImage('default');
  
  try {
    // Check if image_urls is an array with at least one item - prioritize this first
    if (listing.image_urls && Array.isArray(listing.image_urls) && listing.image_urls.length > 0) {
      return listing.image_urls[0];
    }
    
    // Check for primary_image_url next
    if (listing.primary_image_url) return listing.primary_image_url;
    
    // Check for image_url next (directly stored URL)
    if (listing.image_url) return listing.image_url;
    
    // Check for primary_image_id (need to construct URL to API endpoint)
    if (listing.primary_image_id) {
      return `/api/files/${listing.primary_image_id}`;
    }
    
    // No image found, return type-specific placeholder
    return getPlaceholderImage(listing.type || 'house');
  } catch (e) {
    console.error('Error getting image URL:', e);
    return getPlaceholderImage(listing?.type || 'default');
  }
};

/**
 * Gets all image URLs from a listing object
 * @param {Object} listing - The listing object
 * @returns {Array} Array of image URLs
 */
export const getImageUrls = (listing) => {
  if (!listing) return [];
  
  // If image_urls exists and is an array, start with it
  let urls = [];
  
  if (listing.image_urls) {
    if (Array.isArray(listing.image_urls)) {
      urls = [...listing.image_urls];
    } else if (typeof listing.image_urls === 'string') {
      try {
        // Try to parse as JSON
        urls = JSON.parse(listing.image_urls);
        if (!Array.isArray(urls)) urls = [];
      } catch (e) {
        // Not valid JSON, treat as a single URL
        urls = [listing.image_urls];
      }
    }
  }
  
  // If we have a primary_image_url, add it to the front
  if (listing.primary_image_url && !urls.includes(listing.primary_image_url)) {
    urls.unshift(listing.primary_image_url);
  }
  
  // If we have an image_url and it's not in the array, add it
  if (listing.image_url && !urls.includes(listing.image_url)) {
    urls.push(listing.image_url);
  }
  
  // If we have a primary_image_id, create and add API URL
  if (listing.primary_image_id) {
    const url = `/api/files/${listing.primary_image_id}`;
    if (!urls.includes(url)) {
      urls.unshift(url);
    }
  }
  
  // Remove any null or undefined values
  return urls.filter(url => url);
};

/**
 * Returns a placeholder image URL based on listing type
 * @param {string} type - The type of listing (house, car, job, item)
 * @returns {string} URL to placeholder image
 */
export const getPlaceholderImage = (type) => {
  switch (type) {
    case 'house':
      return '/placeholders/house-placeholder.jpg';
    case 'car':
      return '/placeholders/car-placeholder.jpg';
    case 'job':
      return '/placeholders/job-placeholder.jpg';
    case 'item':
      return '/placeholders/item-placeholder.jpg';
    default:
      return '/placeholders/default-placeholder.jpg';
  }
};

/**
 * Handles image upload errors and provides a fallback image
 * @param {Event} event - The error event from img onError
 * @param {string} type - The type of listing
 */
export const handleImageError = (event, type = 'default') => {
  console.log(`Image error handled for type: ${type}`);
  const placeholderUrl = getPlaceholderImage(type);
  
  // Only replace if not already using a placeholder to prevent infinite loops
  if (event.target.src !== placeholderUrl) {
    event.target.src = placeholderUrl;
  }
  
  event.target.onerror = null; // Prevent infinite loop
};

export default {
  getImageUrl,
  getImageUrls,
  getPlaceholderImage,
  handleImageError
};
