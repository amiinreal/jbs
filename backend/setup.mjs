import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create necessary directories
const createDirectories = () => {
  // Create uploads directory
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory');
  }
  
  // Create temp uploads directory
  const tempDir = path.join(uploadsDir, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log('Created temp uploads directory');
  }
  
  // Create placeholders directory
  const placeholdersDir = path.join(__dirname, '..', 'public', 'placeholders');
  if (!fs.existsSync(placeholdersDir)) {
    fs.mkdirSync(placeholdersDir, { recursive: true });
    console.log('Created placeholders directory');
  }
  
  // Create placeholder images if they don't exist
  createPlaceholderImage(placeholdersDir, 'default-placeholder.jpg');
  createPlaceholderImage(placeholdersDir, 'house-placeholder.jpg');
  createPlaceholderImage(placeholdersDir, 'car-placeholder.jpg');
  createPlaceholderImage(placeholdersDir, 'job-placeholder.jpg');
  createPlaceholderImage(placeholdersDir, 'item-placeholder.jpg');
  createPlaceholderImage(placeholdersDir, 'error-placeholder.jpg');
};

// Creates a simple placeholder image
const createPlaceholderImage = (directory, filename) => {
  const filePath = path.join(directory, filename);
  if (!fs.existsSync(filePath)) {
    // Generate a simple 1x1 pixel placeholder
    // This is just a placeholder function - in a real app you'd want 
    // actual placeholder images with proper dimensions
    const placeholderData = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    fs.writeFileSync(filePath, placeholderData);
    console.log(`Created placeholder image: ${filename}`);
  }
};

export { createDirectories };
