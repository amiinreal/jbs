import express from 'express';
import { upload, registerFile } from '../services/fileStorage.js';
import { checkAuthMiddleware } from '../middleware/auth.js';
import pool from '../db.js'; // Import the database pool
import fs from 'fs';

const router = express.Router();

// Simple route to test if uploads endpoint is working
router.get('/status', (req, res) => {
  res.json({
    status: 'operational',
    uploadEnabled: true,
  });
});

// Add specific route for house uploads
router.post('/houses', checkAuthMiddleware, (req, res) => {
  upload.array('images', 5)(req, res, async (err) => {
    if (err) {
      console.error('Upload middleware error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Error uploading file'
      });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }
    
    try {
      const userId = req.user.id;
      const fileIds = [];
      const urls = [];
      
      // Register files in database
      for (const file of req.files) {
        try {
          const fileId = await registerFile(file, userId, 'house');
          fileIds.push(fileId);
          
          // Create URL for client
          const url = `/api/files/${fileId}`;
          urls.push(url);
        } catch (fileErr) {
          console.error('Error registering file:', fileErr);
        }
      }
      
      res.json({ success: true, fileIds, urls });
    } catch (error) {
      console.error('Error uploading house images:', error);
      res.status(500).json({ success: false, error: 'Failed to upload images' });
    }
  });
});

// Upload multiple files
router.post('/multiple', checkAuthMiddleware, (req, res) => {
  upload.array('files', 5)(req, res, async (err) => {
    if (err) {
      console.error('Upload middleware error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Error uploading files'
      });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }
    
    try {
      const userId = req.user.id;
      const { entityType, entityId } = req.body;
      
      const fileIds = [];
      const fileUrls = [];
      
      // Process each file
      for (const file of req.files) {
        const fileId = await registerFile(
          file,
          userId,
          entityType || null,
          entityId || null
        );
        
        fileIds.push(fileId);
        fileUrls.push(`/api/files/${fileId}`);
      }
      
      // Return file info
      res.json({
        success: true,
        fileIds,
        fileUrls
      });
    } catch (error) {
      console.error('Error processing multiple uploads:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process uploads'
      });
    }
  });
});

// Upload a single file
router.post('/', checkAuthMiddleware, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('Upload middleware error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Error uploading file'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    try {
      const userId = req.user.id;
      const { entityType, entityId, isPrimary } = req.body;
      
      // Register file in database
      const fileId = await registerFile(
        req.file,
        userId,
        entityType || null,
        entityId || null
      );
      
      // Return file info
      res.json({
        success: true,
        fileId,
        fileUrl: `/api/files/${fileId}`
      });
    } catch (error) {
      console.error('Error processing upload:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process upload'
      });
    }
  });
});

// Handle job image uploads
router.post('/upload/jobs', checkAuthMiddleware, upload.array('images', 10), async (req, res) => {
  try {
    // Check if user is authenticated and verified company
    const { rows } = await pool.query(
      'SELECT is_verified_company FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (!rows.length || !rows[0].is_verified_company) {
      // Delete uploaded files if user is not verified
      req.files.forEach(file => {
        fs.unlink(file.path, err => {
          if (err) console.error(`Failed to delete file ${file.path}:`, err);
        });
      });
      
      return res.status(403).json({
        success: false, 
        error: 'Only verified companies can upload job images'
      });
    }
    
    // Process uploaded files
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files were uploaded.' });
    }
    
    // Generate URLs for the uploaded files
    const urls = req.files.map(file => {
      // Generate URL based on file path
      const relativePath = file.path.split('public')[1];
      return `${req.protocol}://${req.get('host')}${relativePath}`;
    });
    
    // Save file references to the database if needed
    const fileIds = await Promise.all(req.files.map(async file => {
      const { rows } = await pool.query(
        'INSERT INTO files (user_id, original_name, file_path, file_type, file_size) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [req.user.id, file.originalname, file.path, file.mimetype, file.size]
      );
      return rows[0].id;
    }));
    
    res.json({
      success: true,
      message: `${req.files.length} files uploaded successfully.`,
      urls,
      fileIds
    });
  } catch (err) {
    console.error('Error handling job image uploads:', err);
    res.status(500).json({ success: false, error: 'Failed to upload images' });
  }
});

export default router;
