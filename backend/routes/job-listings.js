const express = require('express');
const router = express.Router();
const pool = require('../db');
const { checkAuthMiddleware } = require('../middleware/auth');

// Create a new job listing
router.post('/', checkAuthMiddleware, async (req, res) => {
  try {
    const {
      title,
      company,
      location,
      job_type,
      description,
      salary,
      experience_required,
      banner_image_url,
      contact_email,
      is_published
    } = req.body;
    
    const userId = req.user.id;
    
    // Check if user is a verified company
    const userCheck = await pool.query(
      'SELECT is_verified_company FROM users WHERE id = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0 || !userCheck.rows[0].is_verified_company) {
      return res.status(403).json({ 
        success: false, 
        error: 'Only verified companies can post job listings' 
      });
    }
    
    // Make sure job_listings table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_listings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        job_type VARCHAR(50) DEFAULT 'full-time',
        description TEXT,
        salary VARCHAR(100),
        experience_required VARCHAR(50),
        banner_image_url TEXT,
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        is_remote BOOLEAN DEFAULT false,
        is_published BOOLEAN DEFAULT true,
        views INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insert job listing
    const { rows } = await pool.query(`
      INSERT INTO job_listings (
        user_id, title, company, location, job_type, description,
        salary, experience_required, banner_image_url, contact_email, is_published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      userId, title, company, location, job_type || 'full-time', description,
      salary || '', experience_required || '', banner_image_url || '',
      contact_email || '', is_published !== undefined ? is_published : true
    ]);
    
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error creating job listing:', err);
    res.status(500).json({
      success: false,
      error: `Failed to create job listing: ${err.message}`
    });
  }
});

// Get all job listings
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT j.*, u.username as author_username, u.company_name
      FROM job_listings j
      LEFT JOIN users u ON j.user_id = u.id
      ORDER BY j.created_at DESC
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching job listings:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch job listings' });
  }
});

// Get public job listings
router.get('/public', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT j.*, u.username as author_username, u.company_name
      FROM job_listings j
      LEFT JOIN users u ON j.user_id = u.id
      WHERE j.is_published = true
      ORDER BY j.created_at DESC
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching public job listings:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch job listings' });
  }
});

module.exports = router;
