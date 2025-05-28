import React from 'react';
import './LoadingOverlay.css';
import LoadingSpinner from './LoadingSpinner';

/**
 * Loading overlay component that covers the entire page or a container
 * @param {Object} props - Component props
 * @param {boolean} props.isLoading - Whether loading state is active
 * @param {string} props.text - Text to display during loading
 * @param {boolean} props.transparent - Whether to use a transparent background
 * @param {React.ReactNode} props.children - Child elements
 * @returns {React.ReactElement} The LoadingOverlay component
 */
const LoadingOverlay = ({ 
  isLoading, 
  text = 'Loading...', 
  transparent = false, 
  children 
}) => {
  return (
    <div className="loading-overlay-container">
      {children}
      
      {isLoading && (
        <div className={`loading-overlay ${transparent ? 'transparent' : ''}`}>
          <div className="loading-overlay-content">
            <LoadingSpinner size="large" color="primary" />
            {text && <p className="loading-text">{text}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadingOverlay;