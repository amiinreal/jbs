import express from 'express';
import cors from 'cors';
import session from 'express-session';
import apiRoutes from './routes.mjs';
import { createTables } from './models.mjs';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { createDirectories, createStorageFolders } from './setup.mjs';
import { executeQuery } from './utils/dbManager.js';
import { corsMiddleware } from './middleware/corsMiddleware.js';

// Get PostgreSQL connection pool
import pool from './db';
import pgSession from 'connect-pg-simple';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000; // Make sure this matches the port in vite.config.js proxy

// Ensure sessions directory exists for file-based fallback
const sessionsDir = path.join(process.cwd(), 'sessions');
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
}

// Configure session with PostgreSQL store for persistence
const PgSession = pgSession(session);
app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'user_sessions', // Will be created automatically
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Improved error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Server error:', err.stack);
  
  // Special handling for database connection errors
  if (err.code && ['57P01', 'ECONNREFUSED', 'ETIMEDOUT'].includes(err.code)) {
    return res.status(503).json({ 
      error: 'Database connection issue', 
      message: 'The server is temporarily unable to connect to the database. Please try again later.'
    });
  }
  
  res.status(500).json({ 
    error: 'Internal server error', 
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
};

// Enhanced CORS configuration with proper credentials handling
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow specific origins
    if (process.env.NODE_ENV !== 'production') {
      const allowedDevOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5000'];
      if (allowedDevOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }
    }
    
    // For production
    const allowedOrigins = [
      'https://yourdomain.com'  // Change to your production domain
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser middleware
app.use(cookieParser());

// Create necessary directories and placeholders on startup
createStorageFolders();

// Serve static files from the public and uploads directories
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Import route modules
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const houseRoutes = require('./routes/houses');
const jobRoutes = require('./routes/jobs');
const jobListingsRoutes = require('./routes/job-listings');
const healthRoutes = require('./routes/health');
const uploadRoutes = require('./routes/uploads');
const debugRoutes = require('./routes/debug');

// Apply CORS middleware before routes
app.use(corsMiddleware);

// Set CORS headers for all responses
app.use((req, res, next) => {
  const allowedOrigins = ['http://localhost:5173', 'http://localhost:5000']; // Allow both Vite dev server and direct API access
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  
  next();
});

// Define a simple health check route that doesn't require the database
app.get('/api/health', (req, res) => {
  // Send CORS headers explicitly
  const origin = req.headers.origin;
  
  if (origin) {
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5000'];
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
  }
  
  res.json({ 
    status: 'ok', 
    message: 'API is running', 
    timestamp: new Date().toISOString(),
    server: 'backend-direct'
  });
});

// Add a special debug endpoint for connectivity testing
app.get('/api/debug/connectivity', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Direct connection to backend server successful',
    clientIp: req.ip,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// Register debug routes
app.use('/api/debug', debugRoutes);

// Apply routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/houses', houseRoutes);
app.use('/api/jobs', jobRoutes); // Apply job routes directly at /api/jobs
app.use('/api/job-listings', jobRoutes); // Add the new route
app.use('/api/upload', uploadRoutes);

// Debug route to verify API is accessible
app.get('/api/debug', (req, res) => {
  res.json({ 
    message: 'API debug endpoint reached successfully',
    time: new Date().toISOString(),
    headers: req.headers
  });
});

// Add an improved auth status endpoint
app.get('/api/auth/status', (req, res) => {
  // Set CORS headers for this special endpoint
  const origin = req.headers.origin;
  if (origin) {
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5000'];
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
  }
  
  // Simple check that minimizes database load
  const isAuthenticated = !!(req.session && req.session.user);
  
  res.json({
    isAuthenticated,
    serverTime: new Date().toISOString(),
    // Include minimal user info if authenticated
    ...(isAuthenticated ? {
      username: req.session.user.username,
      role: req.session.user.role || 'user'
    } : {})
  });
});

// Apply CORS headers for all responses specifically for job-related endpoints
app.use('/api/jobs', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173'); // Allow Vite dev server
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  
  next();
});

// Apply routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/houses', houseRoutes);
app.use('/api/jobs', jobRoutes); // Apply job routes directly at /api/jobs
app.use('/api/job-listings', jobRoutes); // Add the new route
app.use('/api/upload', uploadRoutes);

// Add debug route to verify API is accessible and configured correctly
app.get('/api/debug/routes', (req, res) => {
  // Log request information for debugging
  console.log('Debug route accessed, client IP:', req.ip);
  console.log('Headers:', req.headers);
  
  const routes = [];
  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      // Routes registered directly on the app
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      // Router middleware
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          const path = handler.route.path;
          const methods = Object.keys(handler.route.methods);
          routes.push({ path: path, methods: methods });
        }
      });
    }
  });
  
  res.json({
    routes: routes,
    message: 'API debug endpoint reached successfully',
    time: new Date().toISOString()
  });
});

// Error handling middleware (must be after routes)
app.use(errorHandler);

// Initialize database tables with better error handling
const initializeDatabase = async () => {
  try {
    await createTables();
    console.log('Database tables checked/created');
    return true;
  } catch (err) {
    console.error('Error initializing database:', err);
    
    // Don't exit process on connection errors so we can retry
    if (['57P01', 'ECONNREFUSED', 'ETIMEDOUT'].includes(err.code)) {
      console.log('Will retry database initialization in 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      return initializeDatabase(); // Recursive retry
    }
    
    return false;
  }
};

// Start server with better database initialization handling
const startServer = async () => {
  const dbInitialized = await initializeDatabase();
  
  if (!dbInitialized) {
    console.error('Failed to initialize database after multiple attempts');
    console.log('Starting server anyway - some features may not work correctly');
  }
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();

// Handle unhandled promise rejections without exiting
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Don't exit in production, just log the error
});

// Handle database connection-specific errors at process level
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing database pool gracefully...');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});

// Add explicit OPTIONS handler for CORS preflight requests
app.options('/api/jobs', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(204);
});