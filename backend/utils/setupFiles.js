import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create necessary directories for file storage
export const createStorageFolders = () => {
  const rootDir = path.resolve();
  
  // Create uploads directory
  const uploadsDir = path.join(rootDir, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory');
  }
  
  // Create temp uploads directory
  const tempDir = path.join(uploadsDir, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log('Created temp directory for uploads');
  }
  
  // Create public directory for static assets
  const publicDir = path.join(rootDir, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    console.log('Created public directory');
  }
  
  // Create placeholders directory
  const placeholdersDir = path.join(publicDir, 'placeholders');
  if (!fs.existsSync(placeholdersDir)) {
    fs.mkdirSync(placeholdersDir, { recursive: true });
    console.log('Created placeholders directory');
    
    // Create placeholder images
    createPlaceholderImage(placeholdersDir, 'default-placeholder.jpg');
    createPlaceholderImage(placeholdersDir, 'house-placeholder.jpg');
    createPlaceholderImage(placeholdersDir, 'car-placeholder.jpg');
    createPlaceholderImage(placeholdersDir, 'job-placeholder.jpg');
    createPlaceholderImage(placeholdersDir, 'item-placeholder.jpg');
  }
};

// Create a simple placeholder image
const createPlaceholderImage = (dir, filename) => {
  const filePath = path.join(dir, filename);
  if (!fs.existsSync(filePath)) {
    // Simple 1x1 transparent GIF
    const placeholderData = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    fs.writeFileSync(filePath, placeholderData);
    console.log(`Created placeholder image: ${filename}`);
  }
};
