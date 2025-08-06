#!/usr/bin/env node

/**
 * Script to ensure port 8000 is available before starting the development server.
 * If port 8000 is in use, it will attempt to free it up.
 */

const net = require('net');
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);

const PORT = 8000;

/**
 * Check if a port is in use
 * @param {number} port - Port number to check
 * @returns {Promise<boolean>} - True if port is in use, false otherwise
 */
async function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', () => resolve(true))
      .once('listening', () => {
        server.close();
        resolve(false);
      })
      .listen(port);
  });
}

/**
 * Get the process ID using port 8000
 * @returns {Promise<string|null>} - Process ID or null if not found
 */
async function getProcessUsingPort() {
  try {
    // Linux/MacOS
    const { stdout } = await execPromise(`lsof -ti:${PORT} -sTCP:LISTEN`);
    return stdout.trim();
  } catch (error) {
    if (error.code === 1) {
      // No process found
      return null;
    }
    // Check for Windows if needed
    try {
      const { stdout } = await execPromise(`netstat -ano | findstr :${PORT}`);
      const match = stdout.match(/\s+(\d+)$/);
      return match ? match[1] : null;
    } catch (winError) {
      return null;
    }
  }
}

/**
 * Kill a process by PID
 * @param {string} pid - Process ID to kill
 */
async function killProcess(pid) {
  try {
    if (process.platform === 'win32') {
      await execPromise(`taskkill /F /PID ${pid}`);
    } else {
      await execPromise(`kill -9 ${pid}`);
    }
    console.log(`✅ Killed process ${pid} using port ${PORT}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to kill process ${pid}:`, error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  const portInUse = await isPortInUse(PORT);
  
  if (!portInUse) {
    console.log(`✅ Port ${PORT} is available`);
    process.exit(0);
  }

  console.log(`⚠️  Port ${PORT} is in use. Attempting to free it up...`);
  
  const pid = await getProcessUsingPort();
  
  if (!pid) {
    console.log(`❌ Could not identify process using port ${PORT}. Please free it up manually.`);
    process.exit(1);
  }
  
  console.log(`Found process ${pid} using port ${PORT}`);
  
  // Ask for confirmation before killing the process
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question(`Do you want to kill process ${pid}? (y/N) `, async (answer) => {
    if (answer.toLowerCase() === 'y') {
      const success = await killProcess(pid);
      process.exit(success ? 0 : 1);
    } else {
      console.log('Operation cancelled. Please free up port 8000 manually and try again.');
      process.exit(1);
    }
    rl.close();
  });
}

// Run the script
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
