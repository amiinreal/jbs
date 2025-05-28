import express from 'express';
import path from 'path';
import fs from 'fs';
import { checkAuthMiddleware } from '../middleware/auth.js';
import {
  upload,
  registerFile,
  linkFileToEntity,
  getFileById,
  canAccessFile,
  deleteFile
} from '../services/fileStorage.js';

const router = express.Router();

// Secure file serving endpoint - requires file ID
router.get('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // Get user ID from session if available
    const userId = req.session?.user?.id || null;
    
    // Get file metadata from database
    const file = await getFileById(fileId);
    
    if (!file) {
      return res.status(404).send('File not found');
    }
    
    // Check if user has access to the file
    const hasAccess = await canAccessFile(fileId, userId);
    
    if (!hasAccess) {
      return res.status(403).send('Access denied');
    }
    
    // Get file path
    const filePath = path.join(process.cwd(), 'storage', file.storage_path);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }
    
    // Set appropriate content type
    res.setHeader('Content-Type', file.mime_type);
    
    // Serve the file
    res.sendFile(filePath);
    
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).send('Server error');
  }
});

// Upload endpoint - requires authentication
router.post('/upload', checkAuthMiddleware, (req, res) => {
  // Handle single file upload
  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({
        success: false,
        error: err.message
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
        entityId || null,
        req.body.isPublic === 'true'
      );
      
      // If entity information is provided, link the file
      if (entityType && entityId) {
        await linkFileToEntity(
          fileId,
          entityType,
          entityId,
          isPrimary === 'true'
        );
      }
      
      // Return file ID for reference
      res.json({
        success: true,
        fileId,
        fileUrl: `/api/files/${fileId}`
      });
      
    } catch (error) {
      console.error('Error registering file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to register file'
      });
    }
  });
});

// Upload multiple files endpoint
router.post('/upload/multiple', checkAuthMiddleware, (req, res) => {
  // Handle multiple file upload (max 5)
  upload.array('files', 5)(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({
        success: false,
        error: err.message
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
        // Register file in database
        const fileId = await registerFile(
          file,
          userId,
          entityType || null,
          entityId || null,
          req.body.isPublic === 'true'
        );
        
        // If entity information is provided, link the file
        if (entityType && entityId) {
          await linkFileToEntity(
            fileId,
            entityType,
            entityId,
            false // Not primary for batch uploads
          );
        }
        
        fileIds.push(fileId);
        fileUrls.push(`/api/files/${fileId}`);
      }
      
      // Return file IDs for reference
      res.json({
        success: true,
        fileIds,
        fileUrls
      });
      
    } catch (error) {
      console.error('Error registering files:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to register files'
      });
    }
  });
});

// Delete file endpoint
router.delete('/:fileId', checkAuthMiddleware, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;
    
    // Get file metadata
    const file = await getFileById(fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Check if user owns the file
    if (file.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to delete this file'
      });
    }
    
    // Delete the file
    await deleteFile(fileId);
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file'
    });
  }
});

export default router;
