/**
 * Server management functions for Pose Photobooth
 * Handles starting and stopping the local Express.js server
 */
const { spawn, fork } = require('child_process');
const path = require('path');
const findProcess = require('find-process');
const fs = require('fs');

// Create log file for production debugging
function logToFile(message) {
  try {
    const logDir = 'C:\\Users\\isabu\\Downloads\\tai_reflect';
    // Check if directory exists
    if (!fs.existsSync(logDir)) {
      console.error('Log directory does not exist:', logDir);
      return;
    }
    
    const logFile = path.join(logDir, 'pose-server.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `${timestamp}: ${message}\n`);
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

// Combined log function
function log(message) {
  console.log(message);
  logToFile(message);
}

// Error log function
function logError(message) {
  console.error(message);
  logToFile(`ERROR: ${message}`);
}

// Server configuration
const SERVER_PORT = 9000;
let serverProcess = null;
let serverRunning = false;

/**
 * Start the Express.js server if not already running
 * @returns {Promise<boolean>} Success status
 */
async function startServer() {
  if (serverProcess) return true;

  try {
    // Find the server directory in development or production
    let serverDir;
    
    const isPackaged = process.type === 'browser' && process.resourcesPath && !process.defaultApp;
    log('Is packaged app: ' + isPackaged);
    
    if (isPackaged) {
      // In production, only use resources path (from extraResources)
      const resourcesPath = path.join(process.resourcesPath, 'server-standalone');
      log('Resources path: ' + resourcesPath);
      
      if (fs.existsSync(resourcesPath)) {
        serverDir = resourcesPath;
        log('Using extraResources path for server: ' + serverDir);
      } else {
        logError('Server directory not found in resources path: ' + resourcesPath);
        return false;
      }
    } else {
      // In development, use standard path
      const standardPath = path.join(__dirname, '..', '..', 'server-standalone');
      log('Standard path (development): ' + standardPath);
      
      if (fs.existsSync(standardPath)) {
        serverDir = standardPath;
        log('Using standard path for server: ' + serverDir);
      } else {
        logError('Server directory not found in development path');
        return false;
      }
    }

    // Get index.js path directly
    const indexPath = path.join(serverDir, 'index.js');
    
    // Check if the index.js file exists
    if (!fs.existsSync(indexPath)) {
      logError('Server index.js not found: ' + indexPath);
      return false;
    }
    
    log('Starting server with index.js at: ' + indexPath);
    
    let nodePath;
    if (isPackaged) {
      // In production, try to find Node.js from resources
      const resourcesPath = process.resourcesPath;
      log('Resources path: ' + resourcesPath);
      
      // Check standard Node.js locations
      const possiblePaths = [
        path.join(resourcesPath, 'node', 'node.exe'),
        path.join(process.cwd(), 'resources', 'node', 'node.exe')
      ];
      
      let nodeFound = false;
      log('Searching for Node.js:');
      for (const possiblePath of possiblePaths) {
        log('Checking for Node.js at: ' + possiblePath);
        if (fs.existsSync(possiblePath)) {
          nodePath = possiblePath;
          nodeFound = true;
          log('Found Node.js at: ' + nodePath);
          break;
        }
      }
      
      if (!nodeFound) {
        logError('Node.js not found in expected locations!');
        return false;
      }
    } else {
      // In development, use system Node.js
      nodePath = 'node';
      log('Using system Node.js for development');
    }
    
    // Log the spawn command we're about to execute
    log('Spawning process:');
    log('Node path: ' + nodePath);
    log('Server script: ' + indexPath);
    log('Working directory: ' + serverDir);
    
    try {
      // Use spawn with the specific Node.js path directly to index.js
      log('Attempting to spawn server process...');
      serverProcess = spawn(nodePath, [indexPath], {
        stdio: ['ignore', 'pipe', 'pipe'],  // Capture stdio/stderr
        env: { ...process.env, NODE_ENV: 'production' },
        cwd: serverDir,
        detached: false,
        shell: false
      });
      
      log('Server process spawned with PID: ' + (serverProcess ? serverProcess.pid : 'unknown'));
    } catch (err) {
      logError('Failed to spawn server process: ' + err.message);
      logError('Stack trace: ' + err.stack);
      return false;
    }

    // Log server output
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      log('Server output: ' + output);
    });

    serverProcess.stderr.on('data', (data) => {
      const errorOutput = data.toString().trim();
      logError('Server error: ' + errorOutput);
    });
    
    serverProcess.on('error', (err) => {
      logError('Server process error: ' + err.message);
      logError('Error stack: ' + err.stack);
      serverProcess = null;
      serverRunning = false;
    });

    serverProcess.on('close', (code, signal) => {
      log(`Server process exited with code ${code}, signal: ${signal || 'none'}`);
      serverProcess = null;
      serverRunning = false;
    });

    serverRunning = true;
    console.log('Server started');
    return true;
  } catch (error) {
    console.error('Error starting server:', error);
    return false;
  }
}

/**
 * Stop the Express.js server if running
 * @returns {Promise<boolean>} Success status
 */
async function stopServer() {
  if (!serverProcess) return true;

  try {
    log('Stopping server process...');
    
    // Create a promise that will resolve when the server process exits
    const exitPromise = new Promise((resolve) => {
      serverProcess.once('close', (code, signal) => {
        log(`Server process exited with code ${code}, signal: ${signal || 'none'}`);
        serverRunning = false;
        serverProcess = null;
        resolve(true);
      });
    });
    
    // Try to kill server gracefully
    log('Attempting to kill server gracefully');
    try {
      if (process.platform === 'win32') {
        // On Windows, use SIGTERM first
        log('Sending SIGTERM to server process');
        serverProcess.kill('SIGTERM');
      } else {
        // On other platforms
        log('Sending SIGINT to server process');
        serverProcess.kill('SIGINT');
      }
    } catch (err) {
      logError('Error sending kill signal: ' + err.message);
    }
    
    // Wait for the server to exit or force kill after timeout
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(async () => {
        if (serverProcess) {
          log('Server did not exit gracefully, force killing...');
          
          // Kill server process forcefully
          try {
            log('Sending SIGKILL to server process');
            serverProcess.kill('SIGKILL');
          } catch (err) {
            logError('Error killing server process: ' + err.message);
          }
          
          // Also find and kill any processes using the server port
          try {
            log('Finding processes using port ' + SERVER_PORT);
            const list = await findProcess('port', SERVER_PORT);
            log('Found ' + list.length + ' processes using the port');
            for (const proc of list) {
              try {
                log(`Killing process ${proc.pid} using port ${SERVER_PORT}`);
                process.kill(proc.pid);
              } catch (err) {
                logError(`Could not kill process ${proc.pid}: ${err.message}`);
              }
            }
          } catch (err) {
            logError('Error finding processes by port: ' + err.message);
          }
          
          serverRunning = false;
          serverProcess = null;
        }
        resolve(false);
      }, 2000); // 2 second timeout
    });
    
    // Return based on whichever promise resolves first
    const result = await Promise.race([exitPromise, timeoutPromise]);
    log('Server stopped with result: ' + result);
    return true;
  } catch (error) {
    logError('Error stopping server: ' + error.message);
    logError('Error stack: ' + error.stack);
    
    // Force kill as a last resort
    if (serverProcess) {
      try {
        log('Last resort: sending SIGKILL to server process');
        serverProcess.kill('SIGKILL');
      } catch (e) {
        logError('Failed to kill server with SIGKILL: ' + e.message);
      }
      serverRunning = false;
      serverProcess = null;
    }
    return false;
  }
}

/**
 * Get current server status
 * @returns {Object} Status object with running flag
 */
function getServerStatus() {
  return { running: serverRunning };
}

/**
 * Clean up server resources
 * Should be called when app closes
 */
function cleanupServer() {
  return stopServer();
}

module.exports = {
  startServer,
  stopServer,
  getServerStatus,
  cleanupServer,
  SERVER_PORT
};
