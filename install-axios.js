#!/usr/bin/env node

console.log('Installing axios...');

import { execSync } from 'child_process';

try {
  execSync('npm install axios', { stdio: 'inherit' });
  console.log('✅ Axios installed successfully');
} catch (err) {
  console.error('❌ Error installing axios:', err.message);
  console.log('Try running: npm install axios');
}
