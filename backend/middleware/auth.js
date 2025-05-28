import pool from '../database.js';
import { executeQuery } from '../utils/dbManager.js';

// Check authentication middleware with improved error handling
export const checkAuthMiddleware = async (req, res, next) => {
  // middleware implementation
};

// Check admin role middleware
export const checkAdminMiddleware = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required' 
    });
  }
  
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      error: 'Admin privileges required' 
    });
  }
  
  req.user = req.session.user;
  next();
};

// Check company role middleware
export const checkCompanyMiddleware = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required' 
    });
  }
  
  if (!req.session.user.isCompany) {
    return res.status(403).json({ 
      success: false, 
      error: 'Company account required' 
    });
  }
  
  req.user = req.session.user;
  next();
};

// Check verified company middleware
export const checkVerifiedCompanyMiddleware = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required' 
    });
  }
  
  if (!req.session.user.isCompany || !req.session.user.isVerifiedCompany) {
    return res.status(403).json({ 
      success: false, 
      error: 'Verified company account required' 
    });
  }
  
  req.user = req.session.user;
  next();
};

// Auth middleware for job endpoints
export const jobAuthMiddleware = (req, res, next) => {
  // Check if user is authenticated via session
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  // Add user info to req object
  req.user = {
    id: req.session.userId,
    username: req.session.username,
    isAdmin: req.session.isAdmin || false
  };
  
  next();
};
