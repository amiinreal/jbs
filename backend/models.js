import express from 'express';
import pool from '../database.js';
import { authenticate } from '../middleware/auth.js';
import { validateJobListing } from '../validators/jobValidators.js';

const router = express.Router();

// Get all public job listings
router.get('/jobs/public', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT j.*, u.username as posted_by_username, u.company_name, u.profile_image_url
      FROM jobs j
      LEFT JOIN users u ON j.user_id = u.id
      WHERE j.is_published = true
      ORDER BY j.created_at DESC
    `);
    
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching public job listings:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch job listings' });
  }
});

// Get all job listings (auth required)
router.get('/jobs', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT j.*, u.username as posted_by_username, u.company_name
      FROM jobs j
      LEFT JOIN users u ON j.user_id = u.id
      ORDER BY j.created_at DESC
    `);
    
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching job listings:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch job listings' });
  }
});

// Create a new job listing
router.post('/jobs', authenticate, async (req, res) => {
  try {
    const {
      title,
      company, // This is the company name from the form
      location,
      job_type,
      description,
      salary_min,
      salary_max,
      requirements,
      benefits,
      contact_email,
      contact_phone,
      is_remote
    } = req.body;
    
    const userId = req.user.id;
    
    // Check if user is a verified company
    const { rows: userRows } = await pool.query(
      'SELECT is_verified_company, company_name FROM users WHERE id = $1',
      [userId]
    );
    
    if (!userRows.length || !userRows[0].is_verified_company) {
      return res.status(403).json({
        success: false,
        error: 'Only verified companies can post job listings. Please request company verification first.'
      });
    }
    
    // Use the company name from the user's profile
    const companyName = userRows[0].company_name || company;
    
    // Validate required fields
    if (!title || !location) {
      return res.status(400).json({ 
        success: false, 
        error: 'Required fields are missing: title and location are required.' 
      });
    }
    
    const { rows } = await pool.query(`
      INSERT INTO jobs (
        user_id, title, company_name, location, job_type, description, 
        salary_min, salary_max, requirements, benefits, 
        contact_email, contact_phone, is_remote
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      userId, title, companyName, location, job_type, description,
      salary_min || null, salary_max || null, requirements, benefits,
      contact_email || userRows[0].email, contact_phone, is_remote || false
    ]);
    
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error creating job listing:', err);
    res.status(500).json({ success: false, error: 'Failed to create job listing' });
  }
});

// Get a specific job listing by ID
router.get('/jobs/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT j.*, u.username as posted_by_username, u.company_name, 
             u.profile_image_url, u.logo_url
      FROM jobs j
      LEFT JOIN users u ON j.user_id = u.id
      WHERE j.id = $1
    `, [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Job listing not found' });
    }
    
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error fetching job listing:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch job listing' });
  }
});

export default router;