import pool from '../database.js';

/**
 * Executes a database query with automatic reconnection on failure
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @param {number} retries - Number of retries (default: 3)
 * @returns {Promise} Query result
 */
export const executeQuery = async (text, params = [], retries = 3) => {
  let client;
  let attempt = 0;
  
  while (attempt <= retries) {
    try {
      client = await pool.connect();
      const result = await client.query(text, params);
      client.release();
      return result;
    } catch (err) {
      if (client) {
        client.release(true); // Release with error
      }
      
      attempt++;
      
      // Check if this is a connection error
      const isConnectionError = [
        '57P01', // administrator command termination 
        'ECONNREFUSED',
        'ETIMEDOUT',
        '08006', // connection failure
        '08001', // unable to connect
      ].includes(err.code);
      
      if (isConnectionError && attempt <= retries) {
        // Wait before retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.warn(`Database connection error, retrying in ${delay}ms (attempt ${attempt}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Rethrow if we've exhausted retries or it's not a connection error
        throw err;
      }
    }
  }
};

/**
 * Wraps a function that uses database queries with automatic reconnection
 * @param {Function} fn - Function that performs database operations
 * @returns {Function} Wrapped function with reconnection capabilities
 */
export const withDbRetry = (fn) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      // Check if this is a connection error
      if (['57P01', 'ECONNREFUSED', 'ETIMEDOUT', '08006', '08001'].includes(err.code)) {
        console.warn('Database connection error in operation, retrying...');
        
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try one more time
        return await fn(...args);
      }
      
      // If not a connection error, rethrow
      throw err;
    }
  };
};

export default {
  executeQuery,
  withDbRetry
};
