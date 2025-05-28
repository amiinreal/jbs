const express = require('express');
const router = express.Router();
const pool = require('../database');

// Simple health check that doesn't require authentication
router.get('/', (req, res) => {
  // Allow requests from development server
  const allowedOrigins = ['http://localhost:5173', 'http://localhost:5000'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  res.json({
    status: 'ok',
    message: 'API server is running',
    timestamp: new Date().toISOString(),
    server: process.env.SERVER_NAME || 'backend-api'
  });
});

// Handle OPTIONS preflight requests
router.options('/', (req, res) => {
  const allowedOrigins = ['http://localhost:5173', 'http://localhost:5000'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.sendStatus(204);
});

// Extended health check with database connectivity test
router.get('/extended', async (req, res) => {
  // Add CORS headers
  const allowedOrigins = ['http://localhost:5173', 'http://localhost:5000'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  
  try {
    // Test database connection
    const client = await pool.connect();
    const dbResult = await client.query('SELECT NOW() as timestamp');
    client.release();
    
    res.json({
      status: 'ok',
      message: 'API server is running with database connectivity',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        timestamp: dbResult.rows[0].timestamp
      },
      server: process.env.SERVER_NAME || 'backend-api'
    });
  } catch (err) {
    console.error('Health check with database connectivity failed:', err);
    res.status(500).json({
      status: 'error',
      message: 'API server is running but database connectivity failed',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: err.message
      }
    });
  }
});

module.exports = router;
