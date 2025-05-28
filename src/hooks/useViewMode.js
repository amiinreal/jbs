import { useState, useEffect } from 'react';

/**
 * Custom hook to manage and persist view mode (grid/list) across sessions
 * 
 * @param {string} key - The localStorage key to use for persisting the value
 * @param {string} defaultValue - Default view mode if none is stored
 * @returns {[string, function]} - Current view mode and setter function
 */
function useViewMode(key, defaultValue = 'grid') {
  // Initialize state from localStorage or use default
  const [viewMode, setViewMode] = useState(() => {
    try {
      const storedValue = localStorage.getItem(key);
      return storedValue !== null ? storedValue : defaultValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  });

  // Update localStorage when viewMode changes
  useEffect(() => {
    try {
      localStorage.setItem(key, viewMode);
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  }, [key, viewMode]);

  return [viewMode, setViewMode];
}

export default useViewMode;
