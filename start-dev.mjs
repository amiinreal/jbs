import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Check if the index.html exists
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
  console.log('✅ index.html created');
}

// Check if src/main.jsx exists
const mainPath = path.join(__dirname, 'src', 'main.jsx');
const mainDir = path.join(__dirname, 'src');

if (!fs.existsSync(mainDir)) {
  fs.mkdirSync(mainDir, { recursive: true });
}

if (!fs.existsSync(mainPath)) {
  console.log('Creating src/main.jsx...');
  const main = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`;
  
  fs.writeFileSync(mainPath, main);
  console.log('✅ src/main.jsx created');
}

// Check if src/App.jsx exists
const appPath = path.join(__dirname, 'src', 'App.jsx');
if (!fs.existsSync(appPath)) {
  console.log('Creating src/App.jsx...');
  const app = `import React from 'react'

function App() {
  return (
    <div>
      <h1>JBS - Jobs & Beyond Services</h1>
      <p>Welcome to the application!</p>
    </div>
  )
}

export default App`;
  
  fs.writeFileSync(appPath, app);
  console.log('✅ src/App.jsx created');
}

console.log('Starting development server...');

// Try to run directly from node_modules
console.log('Attempting to run Vite from node_modules...');

try {
  // Try to start the server without vite.config.js
  console.log('Using basic configuration without loading vite.config.js...');
  
  const viteProcess = spawn('npx', [
    'vite',
    '--port', '5173',
    '--host',
    '--no-clearScreen',
    '--config', '-'  // Use stdin config
  ], { 
    stdio: ['pipe', 'inherit', 'inherit'], 
    shell: true 
  });
  
  // Provide a minimal config via stdin
  viteProcess.stdin.write(`export default {
    server: {
      port: 5173,
      proxy: {
        '/api': 'http://localhost:3000'
      }
    },
    plugins: [],
    optimizeDeps: {
      include: ['react', 'react-dom']
    }
  }`);
  
  viteProcess.stdin.end();
  
  viteProcess.on('close', (code) => {
    if (code !== 0) {
      console.log(`Vite process exited with code ${code}`);
      
      // Fallback to running a simple server
      console.log('Attempting fallback method...');
      console.log('You can access the application at http://localhost:5173/');
      
      spawn('npx', ['--yes', 'serve', '-s', '.', '-p', '5173'], {
        stdio: 'inherit',
        shell: true
      });
    }
  });
} catch (err) {
  console.error('Error starting Vite:', err);
  console.log('Using fallback method...');
  
  spawn('npx', ['--yes', 'serve', '-s', '.', '-p', '5173'], {
    stdio: 'inherit',
    shell: true
  });
}
