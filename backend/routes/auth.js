import express from 'express';
import pool from '../database.js';
import bcrypt from 'bcrypt';

const router = express.Router();

// Authentication check endpoint
router.get('/check', async (req, res) => {
  // Add explicit CORS headers for development
  const origin = req.headers.origin;
  if (origin) {
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5000'];
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Cache-Control');
    }
  }
  
  console.log('Auth check received, session:', req.session ? 'exists' : 'missing');
  
  try {
    // If user is not authenticated, return immediately
    if (!req.session || !req.session.user) {
      console.log('No user in session, returning not authenticated');
      return res.json({
        isAuthenticated: false
      });
    }
    
    const userId = req.session.user.id;
    console.log('User ID found in session:', userId);
    
    // Get the latest user info from database with error handling
    try {
      const result = await pool.query(
        'SELECT id, username, email, role_id, is_company, is_verified_company, company_name FROM users WHERE id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        // User no longer exists in database
        console.log('User not found in database, destroying session');
        req.session.destroy(err => {
          if (err) console.error('Error destroying session:', err);
        });
        return res.json({ isAuthenticated: false });
      }
      
      const userData = result.rows[0];
      
      // Get role name with error handling
      let roleName = 'user';
      try {
        const roleResult = await pool.query(
          'SELECT name FROM roles WHERE id = $1',
          [userData.role_id]
        );
        
        roleName = roleResult.rows.length > 0 ? roleResult.rows[0].name : 'user';
      } catch (roleErr) {
        console.error('Error fetching role:', roleErr);
        // Continue with default role
      }
      
      // Update session with latest data
      req.session.user = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        role: roleName,
        isCompany: userData.is_company,
        isVerifiedCompany: userData.is_verified_company,
        company_name: userData.company_name
      };
      
      // Save session explicitly
      req.session.save(err => {
        if (err) {
          console.error('Error saving session:', err);
        }
        
        res.json({
          isAuthenticated: true,
          id: userData.id,
          username: userData.username,
          email: userData.email,
          role: roleName,
          isCompany: userData.is_company,
          isVerifiedCompany: userData.is_verified_company,
          company_name: userData.company_name
        });
      });
    } catch (dbErr) {
      console.error('Database error during auth check:', dbErr);
      
      // If there's a database error but session exists, return authenticated state with session data
      return res.json({
        isAuthenticated: true,
        ...req.session.user
      });
    }
  } catch (err) {
    console.error('Error in auth check endpoint:', err);
    res.json({ isAuthenticated: false });
  }
});

// Improved login endpoint for better session handling
router.post('/login', async (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5000'];
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    }
  }
  
  try {
    const { username, password } = req.body;
    
    console.log(`Login attempt for user: ${username}`);
    
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }
    
    // Find user
    const userResult = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username.trim()]
    );
    
    if (userResult.rows.length === 0) {
      console.log(`User not found: ${username}`);
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }
    
    const user = userResult.rows[0];
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      console.log(`Invalid password for user: ${username}`);
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }
    
    // Fetch role name
    const roleResult = await pool.query(
      'SELECT name FROM roles WHERE id = $1',
      [user.role_id]
    );
    const roleName = roleResult.rows.length > 0 ? roleResult.rows[0].name : 'user';
    
    // Set session with user data
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: roleName,
      isCompany: user.is_company || false,
      isVerifiedCompany: user.is_verified_company || false,
      company_name: user.company_name || ''
    };
    
    // Save session explicitly to ensure cookie is set
    req.session.save(err => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ success: false, error: 'Failed to save session' });
      }
      
      console.log(`User ${username} logged in successfully`);
      
      // Set a long session expiration
      if (req.session.cookie) {
        req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      }
      
      res.json({ 
        success: true, 
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: roleName,
          isCompany: user.is_company || false,
          isVerifiedCompany: user.is_verified_company || false,
          company_name: user.company_name || ''
        }
      });
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Login failed: ' + (err.message || 'Server error') });
  }
});

// Handle OPTIONS requests for login endpoint
router.options('/login', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5000'];
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
      res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    }
  }
  res.sendStatus(204);
});

// Improved logout endpoint
router.post('/logout', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5000'];
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
  }
  
  if (req.session) {
    const username = req.session.user?.username;
    
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ success: false, error: 'Failed to logout' });
      }
      
      res.clearCookie('connect.sid'); // Clear the session cookie
      console.log(`User ${username || 'unknown'} logged out successfully`);
      res.json({ success: true, message: 'Logged out successfully' });
    });
  } else {
    res.json({ success: true, message: 'No active session to logout' });
  }
});

// Quick status check endpoint (minimal functionality for health checks)
router.get('/status', (req, res) => {
  // Allow CORS for this endpoint
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.json({
    isAuthenticated: !!(req.session && req.session.user),
    serverTime: new Date().toISOString()
  });
});

export default router;