/**
 * This script checks if necessary route modules are registered in server.js
 */

import fs from 'fs';
import path from 'path';

const serverJsPath = path.join(process.cwd(), 'server.js');

try {
  const serverContent = fs.readFileSync(serverJsPath, 'utf8');
  
  const missingImports = [];
  const missingRegistrations = [];
  
  // Check for house routes
  if (!serverContent.includes("import houseRoutes from './routes/houses")) {
    missingImports.push("import houseRoutes from './routes/houses.js'");
  }
  if (!serverContent.includes("app.use('/api/houses'")) {
    missingRegistrations.push("app.use('/api/houses', houseRoutes)");
  }
  
  if (missingImports.length > 0 || missingRegistrations.length > 0) {
    console.log('MISSING ROUTE CONFIGURATIONS DETECTED:');
    
    if (missingImports.length > 0) {
      console.log('\nAdd these imports to server.js:');
      missingImports.forEach(imp => console.log(`${imp}`));
    }
    
    if (missingRegistrations.length > 0) {
      console.log('\nAdd these route registrations to server.js:');
      missingRegistrations.forEach(reg => console.log(`${reg}`));
    }
    
    console.log('\nThese changes are needed for proper API functionality.');
  } else {
    console.log('All necessary route configurations appear to be in place.');
  }
} catch (err) {
  console.error('Error checking server.js:', err);
}
