import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Create upload directories if they don't exist
const uploadDir = path.join(process.cwd(), 'uploads');
const dirs = [
  uploadDir,
  path.join(uploadDir, 'logos'),
  path.join(uploadDir, 'houses'),
  path.join(uploadDir, 'cars'),
  path.join(uploadDir, 'items'),
  path.join(uploadDir, 'jobs'),
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage for different types of uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const type = req.params.type || 'misc';
    let dest;
    
    switch (type) {
      case 'logo':
        dest = path.join(uploadDir, 'logos');
        break;
      case 'house':
        dest = path.join(uploadDir, 'houses');
        break;
      case 'car':
        dest = path.join(uploadDir, 'cars');
        break;
      case 'item':
        dest = path.join(uploadDir, 'items');
        break;
      case 'job':
        dest = path.join(uploadDir, 'jobs');
        break;
      default:
        dest = uploadDir;
    }
    
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename
    const uniqueSuffix = uuidv4();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueSuffix + ext);
  }
});

// File filter to only allow image files
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Only image files are allowed'), false);
  }
  
  cb(null, true);
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Function to delete an image file
const deleteImage = (filePath) => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    return true;
  }
  
  return false;
};

export { upload, deleteImage };
