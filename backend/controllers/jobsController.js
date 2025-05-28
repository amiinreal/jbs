import pool from '../database.js';

// Get all job listings
export const getAllJobs = async (req, res) => {
  try {
    // await ensureJobTable(); // Removed
    
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
export const createJob = async (req, res) => {
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
    is_published,
    application_type, // New field
    external_application_url // New field
  } = req.body;
  
  try {
    // await ensureJobTable(); // Removed
    
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
    
    // Validate application_type and external_application_url
    if (application_type === 'external' && !external_application_url) {
      return res.status(400).json({
        success: false,
        error: 'External application URL is required if application type is external.'
      });
    }

    // Insert job into database
    const { rows } = await pool.query(`
      INSERT INTO job_listings (
        user_id, title, company, location, job_type, 
        description, salary, experience_required, banner_image_url,
        contact_email, is_published, application_type, external_application_url,
        contact_phone, is_remote -- Assuming these were intended to be in createJob as well from previous steps
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      userId, 
      title, 
      companyName, 
      location, 
      req.body.job_type || 'full-time', // Use req.body.job_type to get the actual value
      req.body.description || '',
      req.body.salary || '', 
      req.body.experience_required || '', 
      req.body.banner_image_url || '',
      req.body.contact_email || '',
      req.body.is_published !== undefined ? req.body.is_published : true,
      application_type || 'native', // Default to 'native'
      application_type === 'external' ? external_application_url : null, // Only store URL if type is external
      req.body.contact_phone || null,
      req.body.is_remote !== undefined ? req.body.is_remote : false
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

// Get job listings by user ID
export const getJobsByUserId = async (req, res) => {
  try {
    const { userId } = req.params; // This is the ID of the user whose jobs are being requested
    
    // Optional: Add check to ensure the requesting user is the same as userId or an admin
    // For now, assuming any authenticated user can request this if they have the userId.
    // Or, if this is meant for "my-listings", then userId should be req.user.id.
    // Based on the route planned: router.get('/user/:userId', authMiddleware, jobsController.getJobsByUserId);
    // it means the userId from params should be used.

    if (!req.user) {
      // Even if fetching for a specific userId, the requester must be authenticated.
      return res.status(401).json({ success: false, error: 'Authentication required to view job listings' });
    }

    // await ensureJobTable(); // Removed
    
    const { rows } = await pool.query(`
      SELECT j.*, u.username as posted_by_username, u.company_name
      FROM job_listings j
      LEFT JOIN users u ON j.user_id = u.id
      WHERE j.user_id = $1
      ORDER BY j.created_at DESC
    `, [userId]);
    
    // It's not an error if a user has no job listings.
    res.json({ success: true, data: rows });

  } catch (err) {
    console.error('Error fetching job listings by user ID:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch job listings for user' });
  }
};

// Update a job listing
export const updateJob = async (req, res) => {
  const jobId = req.params.id;
  
  if (!req.user || !req.user.id) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  const userId = req.user.id;

  const {
    title,
    company, // This is the company name override or chosen name
    location,
    job_type,
    description,
    salary,
    experience_required,
    banner_image_url,
    contact_email,
    contact_phone,
    is_remote,
    is_published,
    application_type, // New field
    external_application_url // New field
  } = req.body;

  try {
    // await ensureJobTable(); // Removed

    // First, verify ownership
    const jobResult = await pool.query('SELECT user_id FROM job_listings WHERE id = $1', [jobId]);

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Job listing not found' });
    }

    const jobOwnerId = jobResult.rows[0].user_id;
    if (jobOwnerId !== userId) {
      return res.status(403).json({ success: false, error: 'You are not authorized to update this job listing' });
    }

    // Dynamically construct the SET part of the query
    const updates = [];
    const values = [];
    let valueIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${valueIndex++}`);
      values.push(title);
    }
    // If company is provided in the body, it means the user might be overriding
    // their default company name or just explicitly setting it.
    if (company !== undefined) {
      updates.push(`company = $${valueIndex++}`);
      values.push(company);
    }
    if (location !== undefined) {
      updates.push(`location = $${valueIndex++}`);
      values.push(location);
    }
    if (job_type !== undefined) {
      updates.push(`job_type = $${valueIndex++}`);
      values.push(job_type);
    }
    if (description !== undefined) {
      updates.push(`description = $${valueIndex++}`);
      values.push(description);
    }
    if (salary !== undefined) {
      updates.push(`salary = $${valueIndex++}`);
      values.push(salary);
    }
    if (experience_required !== undefined) {
      updates.push(`experience_required = $${valueIndex++}`);
      values.push(experience_required);
    }
    if (banner_image_url !== undefined) {
      updates.push(`banner_image_url = $${valueIndex++}`);
      values.push(banner_image_url);
    }
    if (contact_email !== undefined) {
      updates.push(`contact_email = $${valueIndex++}`);
      values.push(contact_email);
    }
    if (contact_phone !== undefined) {
      updates.push(`contact_phone = $${valueIndex++}`);
      values.push(contact_phone);
    }
    if (is_remote !== undefined) {
      updates.push(`is_remote = $${valueIndex++}`);
      values.push(is_remote);
    }
    if (is_published !== undefined) {
      updates.push(`is_published = $${valueIndex++}`);
      values.push(is_published);
    }
    if (application_type !== undefined) {
      updates.push(`application_type = $${valueIndex++}`);
      values.push(application_type);
      if (application_type === 'native') {
        // If switching to native, clear the external URL
        updates.push(`external_application_url = NULL`);
      }
    }
    if (external_application_url !== undefined && application_type === 'external') {
      updates.push(`external_application_url = $${valueIndex++}`);
      values.push(external_application_url);
    } else if (application_type === 'external' && external_application_url === undefined) {
      // If type is external but URL is not provided in this update, do not clear it,
      // unless the intent is to make it invalid, which should be handled by validation.
      // For now, we only update it if provided. If application_type changes to 'native', it's cleared above.
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No update fields provided' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const updateQuery = `
      UPDATE job_listings 
      SET ${updates.join(', ')}
      WHERE id = $${valueIndex++}
      RETURNING *
    `;
    values.push(jobId);

    const { rows } = await pool.query(updateQuery, values);

    if (rows.length === 0) {
      // This case should ideally not be reached if the initial check passed,
      // but it's a safeguard.
      return res.status(404).json({ success: false, error: 'Job listing not found after update attempt' });
    }

    res.json({ success: true, message: 'Job listing updated successfully', data: rows[0] });

  } catch (err) {
    console.error('Error updating job listing:', err);
    res.status(500).json({ success: false, error: 'Failed to update job listing: ' + err.message });
  }
};

// Delete a job listing
export const deleteJob = async (req, res) => {
  const jobId = req.params.id;

  if (!req.user || !req.user.id) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  const userId = req.user.id;

  try {
    // await ensureJobTable(); // Removed

    // Verify ownership before deleting
    const jobResult = await pool.query('SELECT user_id FROM job_listings WHERE id = $1', [jobId]);

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Job listing not found' });
    }

    const jobOwnerId = jobResult.rows[0].user_id;
    if (jobOwnerId !== userId) {
      // Also check if the user is an admin - for future enhancement
      // const adminCheck = await pool.query('SELECT role_id FROM users WHERE id = $1', [userId]);
      // const userRole = adminCheck.rows[0]?.role_id; // Assuming role_id 2 is admin
      // if (userRole !== 2) { // Replace 2 with actual admin role ID
         return res.status(403).json({ success: false, error: 'You are not authorized to delete this job listing' });
      // }
    }

    const deleteResult = await pool.query('DELETE FROM job_listings WHERE id = $1', [jobId]);

    if (deleteResult.rowCount === 0) {
      // This case implies the job was deleted between the check and the delete command,
      // or the ID was wrong despite the check.
      return res.status(404).json({ success: false, error: 'Job listing not found or already deleted' });
    }

    res.json({ success: true, message: 'Job listing deleted successfully' });

  } catch (err) {
    console.error('Error deleting job listing:', err);
    res.status(500).json({ success: false, error: 'Failed to delete job listing: ' + err.message });
  }
};

// Get a specific job listing
export const getJobById = async (req, res) => {
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
