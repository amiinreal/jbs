const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const jobsController = require('../controllers/jobsController');

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

// Get job by ID
router.get('/:id', jobsController.getJobById);

module.exports = router;
