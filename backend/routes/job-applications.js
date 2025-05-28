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
  const { jobId } = req.params; // This will be available due to mergeParams in the router setup
  const userId = req.user.id;
  const { coverLetter, phone, availability, custom_answers } = req.body; // Expect custom_answers
  const resumePath = req.file ? `/uploads/resumes/${path.basename(req.file.path)}` : null;

  const client = await pool.connect(); // Use a client for transaction

  try {
    await client.query('BEGIN'); // Start transaction

    // Ensure table exists - this function uses the default pool, not the client.
    // For DDL like CREATE TABLE IF NOT EXISTS, it's generally fine outside explicit transaction control
    // if it's idempotent and doesn't interfere with ongoing transactions.
    // However, for consistency in a transactional operation, all queries should ideally use the same client.
    // For now, we'll assume ensureApplicationsTable is safe to call as is.
    await ensureApplicationsTable();

    // Check if job exists
    const jobCheck = await client.query('SELECT id FROM job_listings WHERE id = $1', [jobId]);
    if (jobCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    // Check if already applied
    const existingCheck = await client.query(
      'SELECT id FROM job_applications WHERE job_id = $1 AND user_id = $2',
      [jobId, userId]
    );

    if (existingCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ 
        success: false, 
        error: 'You have already applied for this job' 
      });
    }

    // Create application
    const applicationResult = await client.query(`
      INSERT INTO job_applications (
        job_id, user_id, cover_letter, resume_path, phone, availability
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [
      jobId, userId, coverLetter || null, resumePath, phone || null, availability || null
    ]);
    const applicationId = applicationResult.rows[0].id;

    // Process custom answers
    if (custom_answers && Array.isArray(custom_answers)) {
      const jobQuestions = await client.query(
        'SELECT id, question_text, is_required FROM job_custom_questions WHERE job_id = $1',
        [jobId]
      );

      for (const question of jobQuestions.rows) {
        const userAnswer = custom_answers.find(ans => ans.question_id === question.id || String(ans.question_id) === String(question.id) );
        
        if (question.is_required) {
          if (!userAnswer || !userAnswer.answer_text || userAnswer.answer_text.trim() === '') {
            await client.query('ROLLBACK');
            client.release();
            return res.status(400).json({
              success: false,
              error: `Answer for required question "${question.question_text}" is missing.`
            });
          }
        }

        if (userAnswer && userAnswer.answer_text && userAnswer.answer_text.trim() !== '') {
          await client.query(
            `INSERT INTO job_application_custom_answers (application_id, question_id, answer_text)
             VALUES ($1, $2, $3)`,
            [applicationId, question.id, userAnswer.answer_text]
          );
        }
      }
    }

    await client.query('COMMIT'); // Commit transaction
    console.log(`User ${userId} applied for job ${jobId}, application ID: ${applicationId}`);

    res.json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        id: applicationId,
        jobId,
        status: 'pending'
      }
    });

  } catch (err) {
    await client.query('ROLLBACK'); // Rollback on error
    console.error('Error applying for job:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to submit application: ' + err.message
    });
  } finally {
    client.release(); // Release client
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
    const applicationsResult = await pool.query(`
      SELECT ja.*, 
        u.username AS applicant_username, 
        u.email AS applicant_email, 
        u.profile_image_url AS applicant_profile_image_url
      FROM job_applications ja
      JOIN users u ON ja.user_id = u.id
      WHERE ja.job_id = $1
      ORDER BY ja.created_at DESC
    `, [jobId]);

    const applicationsWithAnswers = [];
    for (const app of applicationsResult.rows) {
      const customAnswersResult = await pool.query(
        `SELECT jcq.question_text, jaca.answer_text 
         FROM job_application_custom_answers jaca
         JOIN job_custom_questions jcq ON jaca.question_id = jcq.id
         WHERE jaca.application_id = $1
         ORDER BY jcq.sort_order ASC, jcq.created_at ASC`,
        [app.id]
      );
      applicationsWithAnswers.push({
        ...app,
        custom_application_responses: customAnswersResult.rows
      });
    }

    res.json({
      success: true,
      data: applicationsWithAnswers
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
