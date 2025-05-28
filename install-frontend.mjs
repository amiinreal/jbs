import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Installing frontend dependencies...');

try {
  // Install Vite and React dependencies
  console.log('Installing Vite and related packages...');
  execSync('npm install --save-dev vite @vitejs/plugin-react', { stdio: 'inherit' });
  
  // Install React dependencies
  console.log('Installing React dependencies...');
  execSync('npm install react react-dom react-router-dom', { stdio: 'inherit' });
  
  // Add axios installation
  console.log('Installing additional dependencies...');
  execSync('npm install axios', { stdio: 'inherit' });
  
  console.log('\nAll frontend dependencies installed successfully!');
  console.log('\nYou can now start the frontend with: npm run start:frontend');
} catch (error) {
  console.error('Error installing frontend dependencies:', error);
  process.exit(1);
}
