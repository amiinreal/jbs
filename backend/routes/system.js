import express from 'express';
import pool from '../database.js';
import { publicEndpointCors } from '../middleware/corsMiddleware.js';

const router = express.Router();

// Apply custom CORS middleware to all system routes
router.use(publicEndpointCors);

// Database connectivity check endpoint - make it public (no auth required)
router.get('/db-check', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as time');
    res.json({ 
      connected: true,
      time: result.rows[0].time,
      message: 'Database connection successful'
    });
  } catch (err) {
    console.error('Database connection check failed:', err);
    res.status(500).json({ 
      connected: false, 
      error: err.message,
      message: 'Database connection failed'
    });
  }
});

export default router;
