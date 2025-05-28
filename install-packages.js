const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Define required packages
const requiredPackages = [
  'multer',       // For file uploads
  'uuid',         // For generating unique IDs
  'fs-extra',     // Enhanced file system operations
  'mime-types'    // For proper MIME type handling
];

console.log('=========================================');
console.log('Installing required packages for JBS app');
console.log('=========================================');

try {
  // Check if package.json exists, if not create it
  const packageJsonPath = path.join(__dirname, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.log('No package.json found. Initializing a new one...');
    execSync('npm init -y', { stdio: 'inherit' });
  }
  
  // Install each package
  console.log('\nInstalling the following packages:');
  requiredPackages.forEach(pkg => console.log(`- ${pkg}`));
  console.log('\nThis may take a moment...\n');
  
  // Install all packages at once for efficiency
  execSync(`npm install ${requiredPackages.join(' ')}`, { stdio: 'inherit' });
  
  console.log('\n✅ All packages installed successfully!');
  console.log('\nYou can now start the server with: node backend/index.mjs');
} catch (error) {
  console.error('\n❌ Error installing packages:', error.message);
  console.error('\nTry installing the packages manually:');
  console.error(`npm install ${requiredPackages.join(' ')}`);
  process.exit(1);
}
