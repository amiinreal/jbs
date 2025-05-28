const express = require('express');
const router = express.Router();
const pool = require('../db');

// CORS for debug endpoints
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Get server status and configuration
router.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    serverInfo: {
      platform: process.platform,
      nodeVersion: process.version,
      uptime: process.uptime()
    }
  });
});

// Check database connectivity
router.get('/database', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as time');
    client.release();
    
    res.json({
      status: 'ok',
      connected: true,
      time: result.rows[0].time
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      connected: false,
      error: err.message
    });
  }
});

// List all registered routes
router.get('/routes', (req, res) => {
  const app = req.app;
  const routes = [];

  // Function to extract routes from a layer
  function extractRoutes(layer, path) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase()).join(',');
      routes.push({ path: path + (layer.route.path || ''), methods });
    } else if (layer.name === 'router' && layer.handle.stack) {
      const prefix = path + (layer.regexp ? layer.regexp.source.replace(/\^\|\\|\/\(\?:\(\[\^\\\/\]\+\?\)\)/g, '') : '');
      layer.handle.stack.forEach(stackItem => extractRoutes(stackItem, prefix));
    }
  }
  
  // Go through all middleware to find routes
  if (app && app._router && app._router.stack) {
    app._router.stack.forEach(layer => extractRoutes(layer, ''));
  }
  
  res.json({
    count: routes.length,
    routes: routes
  });
});

module.exports = router;
