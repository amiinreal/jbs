import React from 'react';
import './LoadingSpinner.css';

/**
 * Reusable loading spinner component
 * @param {Object} props - Component props
 * @param {string} props.size - Size of spinner ('small', 'medium', 'large')
 * @param {string} props.color - Color theme ('primary', 'secondary', 'light', 'dark')
 * @param {string} props.className - Additional CSS classes
 * @returns {React.ReactElement} The LoadingSpinner component
 */
const LoadingSpinner = ({ size = 'medium', color = 'primary', className = '' }) => {
  const spinnerClass = `spinner spinner-${size} spinner-${color} ${className}`;
  
  return (
    <div className={spinnerClass} role="status" aria-label="Loading">
      <div className="spinner-inner">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
  );
};

export default LoadingSpinner;