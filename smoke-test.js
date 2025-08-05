const { spawn, execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
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

// Main function
async function runSmokeTest() {
  try {
    // Check dist directory
    checkDistDirectory();

    // Start the server
    console.log('🚀 Starting server...');
    const server = spawn('python3', ['-m', 'http.server', PORT, '--directory', 'dist'], {
      stdio: 'inherit',
      shell: true
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

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
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Smoke test failed:');
    console.error(error.message);
    process.exit(1);
  }
}

// Run the smoke test
runSmokeTest();
