import express from 'express';
const router = express.Router();
import { checkAuthMiddleware as authMiddleware } from '../middleware/auth.js';
import * as jobsController from '../controllers/jobsController.js';

// Import job applications router
import jobApplicationsRouter from './job-applications.js';

// Enable CORS specifically for job routes
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173'); // Allow Vite dev server
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  
  next();
});

// Debug endpoint to check if router is working
router.get('/check', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Job API is accessible',
    timestamp: new Date().toISOString()
  });
});

// Get all jobs
router.get('/', jobsController.getAllJobs);

// Create a job
router.post('/', authMiddleware, jobsController.createJob);

// Get jobs by user ID (for company to manage their own listings)
router.get('/user/:userId', authMiddleware, jobsController.getJobsByUserId);

// Get job by ID
router.get('/:id', jobsController.getJobById);

// Update a job listing
router.put('/:id', authMiddleware, jobsController.updateJob);

// Delete a job listing
router.delete('/:id', authMiddleware, jobsController.deleteJob);

// Apply job applications routes at /api/jobs/:jobId/applications
router.use('/:jobId/applications', jobApplicationsRouter);

export default router;
