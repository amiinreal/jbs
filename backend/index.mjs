import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Initialize environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize express app
const app = express();

// Configure middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Create storage directory if it doesn't exist
const storageDir = path.join(__dirname, '..', 'storage');
if (!fs.existsSync(storageDir)) {
  try {
    fs.mkdirSync(storageDir, { recursive: true });
    console.log('Storage directory created:', storageDir);
  } catch (err) {
    console.error('Error creating storage directory:', err);
  }
}

// Import routes
import routes from './routes.mjs';

// Add direct health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API server is running',
    timestamp: new Date().toISOString(),
    server: 'backend-direct'
  });
});

// Use main API routes
app.use('/api', routes);

// Static file serving for uploads
app.use('/storage', express.static(path.join(__dirname, '..', 'uploads')));

// Try to initialize database
try {
  const { createTables } = await import('./models.mjs');
  await createTables();
  console.log('Database initialized successfully');
} catch (err) {
  console.error('Error initializing database:', err);
}

// Make sure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Uploads directory created:', uploadsDir);
  } catch (err) {
    console.error('Error creating uploads directory:', err);
  }
}

// Try to import and use file upload routes
try {
  const { upload, registerFile } = await import('./services/fileStorage.js');
  
  // House image upload route
  app.post('/api/upload/houses', (req, res, next) => {
    const uploadMiddleware = upload.array('images', 5);
    uploadMiddleware(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: 'No files uploaded' });
      }
      
      try {
        const userId = req.session.user.id;
        const fileIds = [];
        const urls = [];
        
        for (const file of req.files) {
          const fileId = await registerFile(file, userId, 'house');
          fileIds.push(fileId);
          urls.push(`/api/files/${fileId}`);
        }
        
        res.json({
          success: true,
          fileIds,
          urls
        });
      } catch (error) {
        console.error('Error processing file uploads:', error);
        res.status(500).json({ success: false, error: 'Failed to process uploads' });
      }
    });
  });

  // Item image upload route
  app.post('/api/upload/items', (req, res, next) => {
    const uploadMiddleware = upload.array('images', 5);
    uploadMiddleware(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: 'No files uploaded' });
      }
      
      try {
        const userId = req.session.user.id;
        const fileIds = [];
        const urls = [];
        
        for (const file of req.files) {
          const fileId = await registerFile(file, userId, 'item');
          fileIds.push(fileId);
          urls.push(`/api/files/${fileId}`);
        }
        
        res.json({
          success: true,
          fileIds,
          urls
        });
      } catch (error) {
        console.error('Error processing file uploads:', error);
        res.status(500).json({ success: false, error: 'Failed to process uploads' });
      }
    });
  });

  console.log('File upload routes loaded successfully');
} catch (err) {
  console.error('Error importing file upload services:', err);
  
  // Provide a fallback route
  app.use('/api/upload/:type', (req, res) => {
    res.status(500).json({ 
      error: 'File upload service unavailable', 
      message: 'File upload features are currently unavailable. Required services may be missing.'
    });
  });
}

// Global API Error Handler
app.use((err, req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.error('Global API Error Handler caught:', err.stack || err); // Log the error stack or error itself
    const statusCode = err.status || err.statusCode || 500;
    const errorMessage = err.message || 'An unexpected server error occurred.';
    
    // Ensure not to set headers if already sent (though less likely here)
    if (res.headersSent) {
      return next(err);
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { stack_trace: err.stack }) // Send stack in dev
    });
  } else {
    // For non-API paths, delegate to the default Express error handler
    next(err);
  }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});