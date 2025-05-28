const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Function to check if a package is installed
function isPackageInstalled(packageName) {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    return (
      (packageJson.dependencies && packageJson.dependencies[packageName]) ||
      (packageJson.devDependencies && packageJson.devDependencies[packageName])
    );
  } catch (err) {
    return false;
  }
}

// Packages to install
const requiredPackages = [
  'connect-pg-simple',
  'session-file-store'
];

// Install missing packages
let installed = false;
for (const pkg of requiredPackages) {
  if (!isPackageInstalled(pkg)) {
    console.log(`Installing ${pkg}...`);
    try {
      execSync(`npm install ${pkg}`, { stdio: 'inherit' });
      installed = true;
    } catch (err) {
      console.error(`Failed to install ${pkg}:`, err.message);
    }
  }
}

if (installed) {
  console.log('Packages installed successfully. Please restart your server.');
} else {
  console.log('All required packages are already installed.');
}
