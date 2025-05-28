import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Validates that all required routes are properly registered in server.js
 */
export const validateRoutes = () => {
  console.log('Validating route registrations...');
  
  const serverJsPath = path.join(__dirname, '..', 'server.js');
  
  if (!fs.existsSync(serverJsPath)) {
    console.error(`Error: server.js not found at ${serverJsPath}`);
    return false;
  }
  
  try {
    const serverContent = fs.readFileSync(serverJsPath, 'utf8');
    
    // Check for critical route registrations
    const requiredRoutes = [
      { 
        import: "import fileRoutes from './routes/files.js'",
        usage: "app.use('/api/files', fileRoutes)" 
      },
      { 
        import: "import uploadsRoutes from './routes/uploads.js'",
        usage: "app.use('/api/upload', uploadsRoutes)" 
      }
    ];
    
    const missingRoutes = requiredRoutes.filter(route => {
      const importExists = serverContent.includes(route.import);
      const usageExists = serverContent.includes(route.usage);
      return !importExists || !usageExists;
    });
    
    if (missingRoutes.length > 0) {
      console.warn('WARNING: Missing route registrations detected in server.js:');
      missingRoutes.forEach(route => {
        if (!serverContent.includes(route.import)) {
          console.warn(`- Missing import: ${route.import}`);
        }
        if (!serverContent.includes(route.usage)) {
          console.warn(`- Missing registration: ${route.usage}`);
        }
      });
      return false;
    }
    
    console.log('All required routes appear to be properly registered');
    return true;
  } catch (err) {
    console.error('Error validating routes:', err);
    return false;
  }
};
