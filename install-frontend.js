const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Installing frontend dependencies...');

try {
  // Install Vite and React dependencies
  console.log('Installing Vite and related packages...');
  execSync('npm install --save-dev vite @vitejs/plugin-react', { stdio: 'inherit' });
  
  // Install React dependencies
  console.log('Installing React dependencies...');
  execSync('npm install react react-dom react-router-dom', { stdio: 'inherit' });
  
  console.log('\nAll frontend dependencies installed successfully!');
  console.log('\nYou can now start the frontend with: npm run start:frontend');
} catch (error) {
  console.error('Error installing frontend dependencies:', error.message);
  process.exit(1);
}
