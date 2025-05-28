import express from 'express';
const router = express.Router({ mergeParams: true });
import pool from '../database.js';
import { checkAuthMiddleware } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for resume uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'resumes');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    }
  }
});

// Create DB table if it doesn't exist
const ensureApplicationsTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_applications (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES job_listings(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        cover_letter TEXT,
        resume_path TEXT,
        phone VARCHAR(20),
        availability TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (job_id, user_id)
      )
    `);
    return true;
  } catch (err) {
    console.error('Error creating job_applications table:', err);
    return false;
  }
};

// Apply for a job
router.post('/:jobId/apply', checkAuthMiddleware, upload.single('resume'), async (req, res) => {
  const { jobId } = req.params;
  const userId = req.user.id;
  const { coverLetter, phone, availability } = req.body;
  const resumePath = req.file ? `/uploads/resumes/${path.basename(req.file.path)}` : null;

  try {
    // Ensure table exists
    await ensureApplicationsTable();

    // Check if job exists
    const jobCheck = await pool.query('SELECT id FROM job_listings WHERE id = $1', [jobId]);
    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    // Check if already applied
    const existingCheck = await pool.query(
      'SELECT id FROM job_applications WHERE job_id = $1 AND user_id = $2',
      [jobId, userId]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'You have already applied for this job' 
      });
    }

    // Create application
    const result = await pool.query(`
      INSERT INTO job_applications (
        job_id, user_id, cover_letter, resume_path, phone, availability
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [
      jobId, userId, coverLetter, resumePath, phone, availability
    ]);

    // Notify job poster (this would be implemented with actual messaging/email)
    // For now, just log it
    console.log(`User ${userId} applied for job ${jobId}`);

    res.json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        id: result.rows[0].id,
        jobId,
        status: 'pending'
      }
    });
  } catch (err) {
    console.error('Error applying for job:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to submit application: ' + err.message
    });
  }
});

// Check if user has already applied
router.get('/:jobId/applications/check', checkAuthMiddleware, async (req, res) => {
  const { jobId } = req.params;
  const userId = req.user.id;

  try {
    // Ensure table exists
    await ensureApplicationsTable();

    // Check if already applied
    const result = await pool.query(
      'SELECT id, status FROM job_applications WHERE job_id = $1 AND user_id = $2',
      [jobId, userId]
    );

    res.json({
      success: true,
      hasApplied: result.rows.length > 0,
      applicationInfo: result.rows.length > 0 ? result.rows[0] : null
    });
  } catch (err) {
    console.error('Error checking application status:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to check application status'
    });
  }
});

// Get all applications for a job (job poster only)
router.get('/:jobId/applications', checkAuthMiddleware, async (req, res) => {
  const { jobId } = req.params;
  const userId = req.user.id;

  try {
    // Check if user is the job poster
    const jobCheck = await pool.query(
      'SELECT user_id FROM job_listings WHERE id = $1',
      [jobId]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    if (jobCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'You do not have permission to view these applications' 
      });
    }

    // Get all applications
    const applications = await pool.query(`
      SELECT ja.*, 
        u.username, u.email, u.profile_image_url
      FROM job_applications ja
      JOIN users u ON ja.user_id = u.id
      WHERE ja.job_id = $1
      ORDER BY ja.created_at DESC
    `, [jobId]);

    res.json({
      success: true,
      data: applications.rows
    });
  } catch (err) {
    console.error('Error fetching job applications:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job applications'
    });
  }
});

// Export as default for ES modules
export default router;
