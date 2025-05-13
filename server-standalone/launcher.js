// Simple launcher script for the server
const { spawn } = require('child_process');
const path = require('path');

// Store reference to server process
let serverProcess = null;

// Function to launch the server as a child process
function launchServer() {
  if (serverProcess) {
    console.log('Server is already running');
    return serverProcess;
  }
  
  try {
    // Get the path to the server's index.js
    const serverPath = path.join(__dirname, 'index.js');
    console.log(`Launching server from: ${serverPath}`);
    
    // Check if file exists
    if (!require('fs').existsSync(serverPath)) {
      console.error(`Server file not found: ${serverPath}`);
      throw new Error(`Server file not found: ${serverPath}`);
    }
    
    // Create a new Node.js process to run the server
    serverProcess = spawn(process.execPath, [serverPath], {
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
      detached: false, // Keep attached to parent process
      env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' }
    });
    
    // Log server status
    console.log(`Server process started with PID: ${serverProcess.pid}`);
    
    // Handle server process events
    serverProcess.on('error', (err) => {
      console.error('Failed to start server process:', err);
      if (process.send) {
        process.send({ type: 'error', error: err.message || 'Unknown server error' });
      }
    });
    
    serverProcess.on('exit', (code, signal) => {
      console.log(`Server process exited with code ${code} and signal ${signal}`);
      serverProcess = null;
      if (process.send) {
        process.send({ type: 'exit', code, signal });
      }
    });
    
    // Forward IPC messages from the server to the parent process
    serverProcess.on('message', (message) => {
      console.log('Server message:', message);
      if (process.send) {
        process.send({ type: 'message', message });
      }
    });
    
    // Return the process for management
    return serverProcess;
  } catch (err) {
    console.error('Error launching server:', err);
    if (process.send) {
      process.send({ 
        type: 'error', 
        error: err.message || 'Unknown error launching server'
      });
    }
    return null;
  }
}

// Function to stop the server
function stopServer() {
  return new Promise((resolve, reject) => {
    if (!serverProcess) {
      console.log('No server process to stop');
      resolve({ success: true, message: 'Server not running' });
      return;
    }
    
    console.log(`Stopping server process with PID: ${serverProcess.pid}`);
    
    // Send a message to the server to stop gracefully
    if (serverProcess.connected) {
      serverProcess.send({ type: 'stop' });
      
      // Set a timeout to force kill if necessary
      const forceKillTimeout = setTimeout(() => {
        console.log('Server did not exit gracefully, force killing...');
        if (serverProcess) {
          serverProcess.kill('SIGKILL');
        }
      }, 500);
      
      // Wait for the process to exit
      serverProcess.once('exit', (code, signal) => {
        clearTimeout(forceKillTimeout);
        console.log(`Server stopped with code ${code} and signal ${signal}`);
        serverProcess = null;
        resolve({ success: true, message: 'Server stopped' });
      });
    } else {
      // If not connected, force kill
      serverProcess.kill('SIGKILL');
      serverProcess = null;
      resolve({ success: true, message: 'Server killed' });
    }
  });
}

// Handle messages from parent process
process.on('message', async (message) => {
  console.log('Launcher received message:', message);
  
  try {
    switch (message?.type) {
      case 'start':
        // Start the server
        launchServer();
        if (process.send) {
          process.send({ type: 'started' });
        }
        break;
        
      case 'stop':
        // Stop the server
        await stopServer();
        if (process.send) {
          process.send({ type: 'stopped' });
        }
        break;
        
      case 'status':
        // Return server status
        if (process.send) {
          process.send({ 
            type: 'status', 
            running: !!serverProcess,
            pid: serverProcess ? serverProcess.pid : null
          });
        }
        break;
        
      default:
        console.log(`Unknown command: ${message?.type}`);
        if (process.send) {
          process.send({ type: 'error', error: `Unknown command: ${message?.type}` });
        }
    }
  } catch (err) {
    console.error('Error processing command:', err);
    if (process.send) {
      process.send({ type: 'error', error: err.message || 'Unknown error' });
    }
  }
});

// Auto-start server when launched directly
if (require.main === module) {
  console.log('Launcher started directly, auto-starting server...');
  launchServer();
}

// Export functions for testing
module.exports = {
  launchServer,
  stopServer
};
