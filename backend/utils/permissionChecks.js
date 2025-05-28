import pool from '../database.js';

/**
 * Checks if a user is allowed to post job listings
 * @param {number} userId - The ID of the user to check
 * @returns {Promise<boolean>} - True if the user can post job listings, false otherwise
 */
export const canPostJobListing = async (userId) => {
  try {
    const result = await pool.query(
      'SELECT is_verified_company FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return false;
    }
    
    return result.rows[0].is_verified_company === true;
  } catch (error) {
    console.error('Error checking job posting permissions:', error);
    return false;
  }
};

/**
 * Middleware to ensure only verified companies can post job listings
 */
export const verifiedCompanyRequired = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    // Check if user is a verified company
    const result = await pool.query(
      'SELECT is_company, is_verified_company FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    if (!user.is_company) {
      return res.status(403).json({ 
        success: false, 
        error: 'Only companies can perform this action',
        code: 'NOT_COMPANY'
      });
    }
    
    if (!user.is_verified_company) {
      return res.status(403).json({ 
        success: false, 
        error: 'Your company must be verified to perform this action',
        code: 'COMPANY_NOT_VERIFIED'
      });
    }
    
    next();
  } catch (err) {
    console.error('Error checking company verification:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Check if user is an admin
export const adminRequired = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required' });
    }
    
    next();
  } catch (err) {
    console.error('Error checking admin status:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
