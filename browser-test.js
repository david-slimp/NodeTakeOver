const puppeteer = require('puppeteer');
const http = require('http');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 8000;
const HOST = 'localhost';
const GAME_URL = `http://${HOST}:${PORT}`;

// Track server process for cleanup
let serverProcess;

// Start the server
function startServer() {
  return new Promise((resolve) => {
    // Kill any existing server on the same port
    try {
      execSync(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null`);
    } catch (e) {
      // No process to kill
    }
    
    console.log('🚀 Starting server...');
    serverProcess = spawn('python3', ['-m', 'http.server', PORT, '--directory', 'dist/'], {
      stdio: 'inherit',
      shell: true
    });

    // Simple retry mechanism to check if server is up
    const maxRetries = 10;
    let retries = 0;
    const checkServer = () => {
      http.get(GAME_URL, (res) => {
        if (res.statusCode === 200) {
          console.log(`✅ Server is running at ${GAME_URL}`);
          resolve();
        } else {
          retryOrFail();
        }
      }).on('error', (err) => {
        retryOrFail(err);
      });
    };

    const retryOrFail = (err) => {
      retries++;
      if (retries < maxRetries) {
        console.log(`   Waiting for server to start... (${retries}/${maxRetries})`);
        setTimeout(checkServer, 1000);
      } else {
        console.error('❌ Failed to start server:', err?.message || 'Server did not start in time');
        process.exit(1);
      }
    };

    checkServer();
  });
}

// Run the browser test
async function runBrowserTest() {
  let browser;
  try {
    // Start the server
    await startServer();

    // Launch the browser
    console.log('🌐 Launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set up error and console logging
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        console.error(`🛑 Browser console error: ${text}`);
      } else if (type === 'warning') {
        console.warn(`⚠️  Browser console warning: ${text}`);
      } else {
        console.log(`📝 Browser console.${type}: ${text}`);
      }
    });

    page.on('pageerror', error => {
      console.error(`❌ Page error: ${error.message}`);
    });

    page.on('requestfailed', request => {
      console.error(`❌ Request failed: ${request.url()} - ${request.failure().errorText}`);
    });

    // Navigate to the game
    console.log(`🌐 Navigating to ${GAME_URL}...`);
    
    // Add a listener for page errors
    const errors = [];
    page.on('pageerror', error => {
      const errorMessage = `Page error: ${error.message}\n${error.stack}`;
      console.error(`❌ ${errorMessage}`);
      errors.push(errorMessage);
    });

    // Add a listener for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const errorMessage = `Console error: ${msg.text()}`;
        console.error(`❌ ${errorMessage}`);
        errors.push(errorMessage);
      }
    });

    // Add a listener for failed requests
    page.on('requestfailed', request => {
      const errorMessage = `Request failed: ${request.url()} - ${request.failure().errorText}`;
      console.error(`❌ ${errorMessage}`);
      errors.push(errorMessage);
    });

    // Navigate to the page
    const response = await page.goto(GAME_URL, { 
      waitUntil: 'networkidle0', 
      timeout: 30000 
    });

    if (!response.ok()) {
      throw new Error(`Failed to load page: ${response.status()} ${response.statusText()}`);
    }

    // Check for any errors that might have occurred during page load
    if (errors.length > 0) {
      throw new Error(`Errors occurred during page load:\n${errors.join('\n')}`);
    }

    // Wait for the game to be fully loaded
    console.log('⏳ Waiting for game to initialize...');
    try {
      await page.waitForFunction('window.game !== undefined', { 
        timeout: 10000,
        polling: 100
      });
      console.log('✅ Game initialized');
    } catch (error) {
      // If the game didn't initialize, try to get more information
      const gameState = await page.evaluate(() => {
        return {
          gameDefined: typeof window.game !== 'undefined',
          errors: Array.from(document.querySelectorAll('script[type="module"]')).map(script => {
            return {
              src: script.src,
              error: script.onerror ? 'Error loading script' : null
            };
          }).filter(script => script.error)
        };
      });
      
      console.error('Game initialization failed. Current state:', gameState);
      throw new Error(`Game failed to initialize: ${error.message}`);
    }

    // Find and click the first player node
    console.log('🖱️ Looking for player nodes...');
    const clickResult = await page.evaluate(async () => {
      try {
        // Get all nodes
        const nodes = window.game.nodes || [];
        // Find player's first node (assuming player nodes have owner === 'player')
        const playerNode = nodes.find(node => node.owner === 'player');
        
        if (!playerNode) {
          return { success: false, error: 'No player nodes found' };
        }

        // Get the canvas and its bounding box
        const canvas = document.querySelector('canvas');
        if (!canvas) {
          return { success: false, error: 'Canvas not found' };
        }

        // Get the canvas position and size
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        // Calculate click position (center of the node)
        const x = rect.left + (playerNode.x * scaleX);
        const y = rect.top + (playerNode.y * scaleY);

        // Simulate click
        const clickEvent = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y
        });

        // Dispatch the click event
        canvas.dispatchEvent(clickEvent);
        
        return { 
          success: true, 
          node: { 
            id: playerNode.id, 
            x: playerNode.x, 
            y: playerNode.y,
            units: playerNode.units,
            owner: playerNode.owner
          },
          clickPosition: { x, y }
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    if (!clickResult.success) {
      throw new Error(`Failed to click node: ${clickResult.error}`);
    }

    console.log(`✅ Successfully clicked player node at (${clickResult.node.x}, ${clickResult.node.y})`);
    console.log('   Node details:', clickResult.node);

    // Wait a moment to see if any errors occur after the click
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify that the node was selected by checking the selectedNode property
    const isNodeSelected = await page.evaluate(() => {
      return window.game && window.game.selectedNode !== null;
    });

    if (!isNodeSelected) {
      throw new Error('Failed to select node after click');
    }

    console.log('✅ Successfully selected player node');

    // Check if the game is responding to the selection (e.g., by checking if the node has a different appearance)
    const nodeSelectionState = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { success: false, error: 'Canvas not found' };
      
      const ctx = canvas.getContext('2d');
      const selectedNode = window.game.selectedNode;
      
      // Check if the selected node is highlighted (e.g., has a different border)
      // This is a simple check - you might need to adjust based on your game's rendering
      const pixelData = ctx.getImageData(selectedNode.x, selectedNode.y - 20, 5, 5).data;
      const hasColor = Array.from(pixelData).some(value => value > 0);
      
      return {
        success: true,
        selectedNode: {
          x: selectedNode.x,
          y: selectedNode.y,
          units: selectedNode.units,
          owner: selectedNode.owner,
          isHighlighted: hasColor
        }
      };
    });

    console.log('Node selection state:', nodeSelectionState);

    // Take a screenshot for debugging
    const screenshotPath = 'test-screenshot.png';
    await page.screenshot({ path: screenshotPath });
    console.log(`📸 Screenshot saved to ${screenshotPath}`);

    console.log('\n🎉 Browser test completed successfully!');
    console.log('The game is now running with a selected node.');
    console.log('You can now interact with the game in the browser.');
    
    // Keep the browser open for manual testing if needed
    if (process.env.CLOSE_BROWSER !== 'false') {
      await browser.close();
      serverProcess.kill();
      process.exit(0);
    } else {
      console.log('\nBrowser will stay open for manual testing.');
      console.log('Press Ctrl+C to exit.');
    }

  } catch (error) {
    console.error('❌ Browser test failed:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

// Run the test
runBrowserTest();
