const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Define required packages for frontend
const requiredPackages = [
  'react',
  'react-dom',
  'react-router-dom',
  'vite',
  '@vitejs/plugin-react'
];

console.log('Checking for required frontend packages...');

try {
  // Check if package.json exists in the frontend directory
  const frontendDir = path.join(__dirname, 'src');
  const packageJsonPath = path.join(__dirname, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.log('No package.json found. Initializing a new one...');
    execSync('npm init -y', { stdio: 'inherit' });
  }
  
  // Install required packages if they're missing
  for (const pkg of requiredPackages) {
    try {
      require.resolve(pkg);
      console.log(`✓ ${pkg} is already installed`);
    } catch (e) {
      console.log(`Installing missing package: ${pkg}...`);
      execSync(`npm install ${pkg}`, { stdio: 'inherit' });
    }
  }
  
  // Make sure dev dependencies are installed
  console.log('Installing development dependencies...');
  execSync('npm install --save-dev @vitejs/plugin-react', { stdio: 'inherit' });
  
  // Start the frontend
  console.log('\nStarting the frontend application...');
  execSync('npx vite', { stdio: 'inherit' });
  
} catch (error) {
  console.error('Error starting frontend:', error.message);
  process.exit(1);
}
