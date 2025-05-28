#!/usr/bin/env node

// Converting to ES modules since package.json has "type": "module"
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting JBS application with minimal configuration...');

try {
  console.log('Installing critical dependencies...');
  execSync('npm install -D vite @vitejs/plugin-react serve', { stdio: 'inherit' });
  console.log('Installing React dependencies...');
  execSync('npm install react react-dom react-router-dom axios', { stdio: 'inherit' });
  
  // Create minimal index.html if it doesn't exist
  const indexPath = path.join(__dirname, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.log('Creating index.html...');
    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>JBS - Jobs & Beyond Services</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;
    
    fs.writeFileSync(indexPath, html);
  }
  
  // Create minimal vite.config.js
  const viteConfigPath = path.join(__dirname, 'vite.config.js');
  console.log('Creating simple vite.config.js...');
  const viteConfig = `export default {
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
}`;
  
  fs.writeFileSync(viteConfigPath, viteConfig);
  
  // Create src directory and basic files if needed
  const srcDir = path.join(__dirname, 'src');
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
  }
  
  // Create simple App.jsx
  const appPath = path.join(srcDir, 'App.jsx');
  if (!fs.existsSync(appPath)) {
    const appContent = `import React from 'react'

function App() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: '#4b6cb7' }}>JBS - Jobs & Beyond Services</h1>
      <p>Welcome to the application!</p>
    </div>
  )
}

export default App`;
    
    fs.writeFileSync(appPath, appContent);
  }
  
  // Create simple main.jsx
  const mainPath = path.join(srcDir, 'main.jsx');
  if (!fs.existsSync(mainPath)) {
    const mainContent = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`;
    
    fs.writeFileSync(mainPath, mainContent);
  }
  
  console.log('\nStarting the frontend directly...');
  execSync('npx vite --host', { stdio: 'inherit' });
} catch (error) {
  console.error('Error:', error.message);
  console.log('\nTrying fallback method with "serve"...');
  
  try {
    execSync('npx serve -s .', { stdio: 'inherit' });
  } catch (serveError) {
    console.error('Fallback also failed:', serveError.message);
    
    // Ultimate fallback - create and serve a simple HTML page
    console.log('Creating simple HTML file to serve...');
    const simplePage = `<!DOCTYPE html>
<html>
<head>
  <title>JBS - Jobs & Beyond Services</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #4b6cb7; }
    .message { background: #f9f9f9; padding: 20px; border-radius: 5px; margin-top: 20px; }
  </style>
</head>
<body>
  <h1>JBS - Jobs & Beyond Services</h1>
  <div class="message">
    <h2>Frontend Development Server</h2>
    <p>There was an issue starting the Vite development server.</p>
    <p>Please make sure all dependencies are installed correctly:</p>
    <pre>npm install</pre>
    <p>Then try running the development server manually:</p>
    <pre>npx vite</pre>
  </div>
</body>
</html>`;
    
    fs.writeFileSync(path.join(__dirname, 'index.static.html'), simplePage);
    console.log('Opening static HTML file...');
    
    // Try to open the file in the default browser
    const openCommand = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    try {
      execSync(`${openCommand} ${path.join(__dirname, 'index.static.html')}`, { stdio: 'inherit' });
    } catch (e) {
      console.log('Please open the file manually: index.static.html');
    }
  }
}
