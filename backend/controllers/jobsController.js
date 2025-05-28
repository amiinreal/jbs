const pool = require('../db');

// Create job table if it doesn't exist
const ensureJobTable = async () => {
  try {
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
        image_url TEXT,
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        is_remote BOOLEAN DEFAULT false,
        is_published BOOLEAN DEFAULT true,
        views INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    return true;
  } catch (err) {
    console.error('Error ensuring job table exists:', err);
    return false;
  }
};

// Get all job listings
exports.getAllJobs = async (req, res) => {
  try {
    await ensureJobTable();
    
    const { rows } = await pool.query(`
      SELECT j.*, u.username as posted_by_username, u.company_name
      FROM job_listings j
      LEFT JOIN users u ON j.user_id = u.id
      WHERE j.is_published = true
      ORDER BY j.created_at DESC
    `);
    
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching job listings:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch job listings' });
  }
};

// Create a new job listing
exports.createJob = async (req, res) => {
  console.log('POST /api/jobs received:', req.body);
  
  // Check if user is authenticated
  if (!req.user) {
    console.log('User not authenticated');
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required to create job listings' 
    });
  }
  
  const userId = req.user.id;
  
  // Extract job data from request body
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
  
  try {
    // Ensure job table exists
    await ensureJobTable();
    
    // Validate required fields
    if (!title) {
      return res.status(400).json({ 
        success: false, 
        error: 'Job title is required' 
      });
    }
    
    if (!location) {
      return res.status(400).json({ 
        success: false, 
        error: 'Job location is required' 
      });
    }
    
    // Get user info for company name
    const userResult = await pool.query(
      'SELECT company_name FROM users WHERE id = $1',
      [userId]
    );
    
    // Use provided company name or fallback to user's company name
    const companyName = company || (userResult.rows[0] ? userResult.rows[0].company_name : null);
    
    if (!companyName) {
      return res.status(400).json({
        success: false,
        error: 'Company name is required'
      });
    }
    
    // Insert job into database
    const { rows } = await pool.query(`
      INSERT INTO job_listings (
        user_id, title, company, location, job_type, 
        description, salary, experience_required, banner_image_url,
        contact_email, is_published
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      userId, 
      title, 
      companyName, 
      location, 
      job_type || 'full-time', 
      description || '',
      salary || '', 
      experience_required || '', 
      banner_image_url || '',
      contact_email || '',
      is_published !== undefined ? is_published : true
    ]);
    
    console.log('Job listing created successfully:', rows[0]);
    
    res.status(201).json({ 
      success: true, 
      message: 'Job listing created successfully',
      data: rows[0] 
    });
  } catch (err) {
    console.error('Error creating job listing:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create job listing: ' + err.message 
    });
  }
};

// Get a specific job listing
exports.getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await pool.query(`
      SELECT j.*, u.username as posted_by_username, u.company_name
      FROM job_listings j
      LEFT JOIN users u ON j.user_id = u.id
      WHERE j.id = $1
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Job listing not found' 
      });
    }
    
    res.json({ 
      success: true, 
      data: rows[0] 
    });
  } catch (err) {
    console.error('Error fetching job listing:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch job listing' 
    });
  }
};
