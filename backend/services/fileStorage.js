import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import pool from '../database.js';

// Create storage directories
const storageRoot = path.join(process.cwd(), 'storage');
const uploadDir = path.join(process.cwd(), 'uploads');
const imageDir = path.join(uploadDir, 'images');

// Create directories if they don't exist
for (const dir of [storageRoot, uploadDir, imageDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, imageDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Initialize multer with storage configuration
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: function(req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

/**
 * Register file metadata in the database
 * @param {Object} file - File object from multer
 * @param {number} userId - User ID who uploaded the file
 * @param {string} entityType - Type of entity this file belongs to (house, car, etc.)
 * @param {number|null} entityId - ID of the entity, if known
 * @param {boolean} isPublic - Whether the file is public
 * @returns {Promise<number>} - Returns the file ID
 */
const registerFile = async (file, userId, entityType = null, entityId = null, isPublic = false) => {
  // Make sure file object is valid
  if (!file || !file.path) {
    throw new Error('Invalid file object');
  }
  
  // Get relative path to storage
  const relativePath = path.relative(process.cwd(), file.path);
  
  try {
    const result = await pool.query(
      `INSERT INTO files 
        (original_name, storage_path, mime_type, size, user_id, entity_type, entity_id, is_public) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING id`,
      [file.originalname, relativePath, file.mimetype, file.size, userId, entityType, entityId, isPublic]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Failed to register file in database');
    }
    
    return result.rows[0].id;
  } catch (err) {
    console.error('Error registering file:', err);
    throw err;
  }
};

// Link a file to an entity
const linkFileToEntity = async (fileId, entityType, entityId, isPrimary = false) => {
  try {
    // Update the file record with entity info
    await pool.query(
      `UPDATE files SET entity_type = $1, entity_id = $2 WHERE id = $3`,
      [entityType, entityId, fileId]
    );
    
    // Handle primary image setting if requested
    if (isPrimary) {
      // Determine which table and column to update based on entity type
      let tableName = '';
      switch (entityType) {
        case 'house':
          tableName = 'houses';
          break;
        case 'car':
          tableName = 'cars';
          break;
        case 'item':
          tableName = 'items';
          break;
        case 'job':
          tableName = 'jobs';
          break;
        case 'user':
          tableName = 'users';
          break;
        default:
          throw new Error(`Unknown entity type: ${entityType}`);
      }
      
      // Update the entity with the new primary image ID
      await pool.query(
        `UPDATE ${tableName} SET primary_image_id = $1 WHERE id = $2`,
        [fileId, entityId]
      );
    }
  } catch (err) {
    console.error('Error linking file to entity:', err);
    throw err;
  }
};

// Get file by ID
const getFileById = async (fileId) => {
  try {
    const result = await pool.query(
      'SELECT * FROM files WHERE id = $1',
      [fileId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (err) {
    console.error('Error getting file by ID:', err);
    throw err;
  }
};

// Check if a user can access a file
const canAccessFile = async (fileId, userId = null) => {
  try {
    // Get the file metadata
    const fileResult = await pool.query(
      'SELECT * FROM files WHERE id = $1',
      [fileId]
    );
    
    if (fileResult.rows.length === 0) {
      return false;
    }
    
    const file = fileResult.rows[0];
    
    // Public files are accessible to everyone
    if (file.is_public) {
      return true;
    }
    
    // If the user is the owner, they can access it
    if (userId && file.user_id === userId) {
      return true;
    }
    
    // If the file is linked to a published entity, anyone can access it
    if (file.entity_type && file.entity_id) {
      const entityType = file.entity_type;
      const entityId = file.entity_id;
      
      // Check if the entity is published
      let tableName = '';
      switch (entityType) {
        case 'house':
          tableName = 'houses';
          break;
        case 'car':
          tableName = 'cars';
          break;
        case 'item':
          tableName = 'items';
          break;
        case 'job':
          tableName = 'jobs';
          break;
        case 'user':
          return true; // User profiles are considered public
        default:
          return false;
      }
      
      const entityResult = await pool.query(
        `SELECT is_published FROM ${tableName} WHERE id = $1`,
        [entityId]
      );
      
      if (entityResult.rows.length > 0 && entityResult.rows[0].is_published) {
        return true;
      }
    }
    
    // If none of the above conditions are met, access is denied
    return false;
  } catch (err) {
    console.error('Error checking file access:', err);
    return false;
  }
};

// Delete a file
const deleteFile = async (fileId) => {
  try {
    // Get the file metadata
    const fileResult = await pool.query(
      'SELECT * FROM files WHERE id = $1',
      [fileId]
    );
    
    if (fileResult.rows.length === 0) {
      throw new Error('File not found');
    }
    
    const file = fileResult.rows[0];
    
    // Delete the file from storage
    const filePath = path.join(process.cwd(), file.storage_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete the file record from the database
    await pool.query(
      'DELETE FROM files WHERE id = $1',
      [fileId]
    );
    
    return true;
  } catch (err) {
    console.error('Error deleting file:', err);
    throw err;
  }
};

export { 
  upload, 
  registerFile, 
  linkFileToEntity,
  getFileById,
  canAccessFile,
  deleteFile
};
