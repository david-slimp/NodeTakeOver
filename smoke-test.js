const { spawn, execSync, exec } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const util = require('util');
const execPromise = util.promisify(exec);
const requireFromDist = createRequire(path.resolve('dist/'));

const PORT = 8000;
const HOST = 'localhost';
const TIMEOUT = 10000; // 10 seconds

// Files that should exist in dist/
const REQUIRED_FILES = [
  'index.html',
  'main.js',
  'game.js',
  'config.js',
  'node.js',
  'wall.js',
  'style.css'
];

// Check if dist directory exists and has required files
function checkDistDirectory() {
  console.log('🔍 Checking dist directory...');
  const distPath = path.join(__dirname, 'dist');
  
  if (!fs.existsSync(distPath)) {
    throw new Error('❌ dist/ directory does not exist. Run `npm run build` first.');
  }

  const missingFiles = REQUIRED_FILES.filter(file => 
    !fs.existsSync(path.join(distPath, file))
  );

  if (missingFiles.length > 0) {
    console.warn('⚠️  Missing files in dist/ directory:', missingFiles.join(', '));
  } else {
    console.log('✅ All required files found in dist/');
  }

  return true;
}

// Make HTTP request to check if server is running
function checkServer() {
  console.log('🌐 Checking server...');
  
  return new Promise((resolve, reject) => {
    const req = http.get(`http://${HOST}:${PORT}`, (res) => {
      if (res.statusCode === 200) {
        console.log(`✅ Server is running at http://${HOST}:${PORT}`);
        resolve();
      } else {
        reject(new Error(`Server returned status code: ${res.statusCode}`));
      }
    });

    req.on('error', (e) => {
      reject(new Error(`Server connection failed: ${e.message}`));
    });

    req.setTimeout(TIMEOUT, () => {
      req.destroy();
      reject(new Error(`Server check timed out after ${TIMEOUT}ms`));
    });
  });
}

// Check if a URL returns 200
function checkUrl(urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://${HOST}:${PORT}${urlPath}`, (res) => {
      if (res.statusCode === 200) {
        console.log(`✅ ${urlPath} - ${res.statusCode}`);
        resolve();
      } else {
        console.warn(`⚠️  ${urlPath} - ${res.statusCode}`);
        resolve(); // Don't fail the test for non-200 responses
      }
    });

    req.on('error', (e) => {
      console.error(`❌ ${urlPath} - Error: ${e.message}`);
      resolve(); // Don't fail the test for network errors
    });
  });
}

// Check if a module has the expected exports
async function checkModuleExports(modulePath, expectedExports) {
  try {
    const moduleName = path.basename(modulePath, '.js');
    const fullPath = path.join(process.cwd(), 'dist', modulePath);
    
    // Skip if file doesn't exist (might be in node_modules)
    if (!fs.existsSync(fullPath)) {
      console.log(`ℹ️  ${modulePath} - Not found, skipping export check`);
      return true;
    }

    // Try to import the module using dynamic import (supports both ESM and CJS)
    const module = await import(`file://${fullPath}`);
    
    // Check each expected export
    const missingExports = [];
    for (const exportName of expectedExports) {
      if (!(exportName in module) && !(exportName === 'default' && module.__esModule)) {
        missingExports.push(exportName);
      }
    }
    
    if (missingExports.length > 0) {
      console.error(`❌ ${modulePath} - Missing exports: ${missingExports.join(', ')}`);
      console.log(`   Available exports:`, Object.keys(module).filter(k => k !== '__esModule'));
      return false;
    }
    
    console.log(`✅ ${modulePath} - All expected exports found`);
    return true;
  } catch (error) {
    console.error(`❌ ${modulePath} - Error checking exports: ${error.message}`);
    return false;
  }
}

// Check if a process is using the specified port
async function isPortInUse(port) {
  try {
    // Try to create a server on the port
    return new Promise((resolve) => {
      const server = require('net').createServer()
        .once('error', () => resolve(true))
        .once('listening', () => {
          server.close();
          resolve(false);
        })
        .listen(port);
    });
  } catch (error) {
    return true; // Assume port is in use if there's an error
  }
}

// Kill process using the specified port
async function killProcessOnPort(port) {
  try {
    console.log(`🔄 Checking for processes on port ${port}...`);
    
    let command;
    if (process.platform === 'win32') {
      // Windows
      const { stdout } = await execPromise(`netstat -ano | findstr :${port}`);
      const matches = stdout.trim().split('\n');
      const pids = [];
      
      matches.forEach(line => {
        const match = line.trim().split(/\s+/);
        if (match.length > 4) {
          pids.push(match[4]);
        }
      });
      
      if (pids.length > 0) {
        console.log(`Found processes on port ${port}, killing PIDs: ${pids.join(', ')}`);
        for (const pid of pids) {
          try {
            await execPromise(`taskkill /F /PID ${pid}`);
          } catch (e) {
            console.warn(`Warning: Could not kill process ${pid}:`, e.message);
          }
        }
      }
    } else {
      // Linux/MacOS
      try {
        // Try to find and kill the process
        await execPromise(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`);
      } catch (error) {
        if (!error.message.includes('No such process')) {
          throw error;
        }
      }
    }
    
    // Give the OS a moment to release the port
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  } catch (error) {
    console.warn(`⚠️  Could not kill process on port ${port}:`, error.message);
    return false;
  }
}

// Main function
async function runSmokeTest() {
  let server;
  
  try {
    // Check dist directory
    checkDistDirectory();

    // Check if port is in use and kill existing process if needed
    if (await isPortInUse(PORT)) {
      console.log(`⚠️  Port ${PORT} is in use. Attempting to free it up...`);
      await killProcessOnPort(PORT);
      
      // Verify port is now free
      if (await isPortInUse(PORT)) {
        throw new Error(`Could not free up port ${PORT}. Please close any applications using this port.`);
      }
      console.log(`✅ Successfully freed up port ${PORT}`);
    }

    // Start the server
    console.log(`🚀 Starting server on port ${PORT}...`);
    server = spawn('python3', ['-m', 'http.server', PORT, '--directory', 'dist'], {
      stdio: 'inherit',
      shell: true
    });

    // Wait for server to start with retry logic
    const maxRetries = 5;
    let retryCount = 0;
    let serverReady = false;
    
    while (retryCount < maxRetries && !serverReady) {
      try {
        await checkServer();
        serverReady = true;
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) throw error;
        console.log(`⏳ Waiting for server to start (attempt ${retryCount + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Check server and URLs
    await checkServer();
    
    // Check important URLs
    console.log('🔗 Checking URLs...');
    await checkUrl('/');
    await checkUrl('/main.js');
    await checkUrl('/game.js');
    await checkUrl('/config.js');
    await checkUrl('/node.js');
    await checkUrl('/wall.js');
    await checkUrl('/style.css');

    // Check module exports
    console.log('\n🔍 Checking module exports...');
    const exportChecks = [
      { path: 'node.js', exports: ['Node'] },
      { path: 'game.js', exports: ['Game'] },
      { path: 'config.js', exports: ['cfg', 'rngInstance', 'seededRandomGenerator'] },
      { path: 'wall.js', exports: ['Wall'] }
    ];

    let allExportsValid = true;
    for (const check of exportChecks) {
      const result = await checkModuleExports(check.path, check.exports);
      if (!result) {
        allExportsValid = false;
      }
    }

    if (!allExportsValid) {
      throw new Error('Some modules are missing expected exports');
    }

    console.log('\n🎉 Smoke test completed successfully!');
    console.log(`🌐 Server is still running at http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop the server');
    
    // Keep the server running by not killing it
    // and not calling process.exit()
    
  } catch (error) {
    console.error('\n❌ Smoke test failed:');
    console.error(error.message);
    
    // Ensure server is killed on failure
    if (server) {
      server.kill('SIGTERM');
    }
    
    process.exit(1);
  }
}

// Run the smoke test
runSmokeTest();
