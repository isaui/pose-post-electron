/**
 * Preload script for Electron
 * Injects API and UI controls into Next.js web application
 */
const { ipcRenderer } = require('electron');
const { createUI } = require('./ui/index');
const io = require('socket.io-client');

// Socket.IO client reference
let socket = null;
let isConnected = false;

/**
 * Initialize the preload script
 */
function init() {
  console.log('Preload script initializing...');

  // Expose API to renderer process
  exposeAPI();
  
  // Setup UI injection when DOM loads
  setupUIInjection();
  
  // Initialize Socket.IO connection
  setupSocketConnection();
  
  console.log('Preload script initialized successfully!');
}

/**
 * Setup Socket.IO connection to the local DSLR server
 */
function setupSocketConnection() {
  const LOCAL_SERVER_URL = 'http://localhost:9000';
  
  // Create socket connection (but don't connect automatically)
  socket = io(LOCAL_SERVER_URL, { autoConnect: false });
  
  // Setup event handlers
  socket.on('connect', () => {
    console.log('[Electron Socket.IO] Connected to DSLR server');
    isConnected = true;
    // Dispatch connection status event to renderer
    window.dispatchEvent(new CustomEvent('electron-connection-status', { 
      detail: { connected: true } 
    }));
  });
  
  socket.on('disconnect', () => {
    console.log('[Electron Socket.IO] Disconnected from DSLR server');
    isConnected = false;
    // Dispatch connection status event to renderer
    window.dispatchEvent(new CustomEvent('electron-connection-status', { 
      detail: { connected: false } 
    }));
  });
  
  // Handle liveview event
  socket.on('liveview', (base64Image) => {
    // Forward liveview data to renderer
    window.dispatchEvent(new CustomEvent('electron-liveview', { 
      detail: base64Image 
    }));
  });
  
  // Handle capture event
  socket.on('capture', (base64Image) => {
    // Forward capture data to renderer
    window.dispatchEvent(new CustomEvent('electron-capture', { 
      detail: base64Image 
    }));
  });
  
  // Initially try to connect
  tryConnectSocket();
  
  // Setup periodic reconnection attempts
  setInterval(tryConnectSocket, 5000); // Try every 5 seconds if not connected
}

/**
 * Try to connect Socket.IO if not already connected
 */
function tryConnectSocket() {
  if (socket && !socket.connected) {
    console.log('[Electron Socket.IO] Attempting to connect...');
    socket.connect();
  }
}

/**
 * Expose server control API to renderer
 */
function exposeAPI() {
  // Import node-fetch for server requests
  const fetch = require('node-fetch');  
  // Base URL for local server
  const LOCAL_SERVER_URL = 'http://localhost:9000';
  
  // Utility to make requests to local server
  const fetchFromLocalServer = async (endpoint, options = {}) => {
    try {
      console.log(`[Electron Proxy] Fetching from ${endpoint}`);
      const url = `${LOCAL_SERVER_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
      
      const response = await fetch(url, options);
      
      // Check response content type
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return { 
          data,
          status: response.status, 
          ok: response.ok 
        };
      } else {
        const text = await response.text();
        return { 
          data: text, 
          status: response.status, 
          ok: response.ok 
        };
      }
    } catch (error) {
      console.error(`[Electron Proxy] Error:`, error);
      return { 
        error: error.message, 
        status: 500, 
        ok: false 
      };
    }
  };
  
  window.poseAPI = {
    // Get current server status
    getServerStatus: async () => {
      return await ipcRenderer.invoke('server-status');
    },
    
    // Toggle server on/off
    toggleServer: async () => {
      const result = await ipcRenderer.invoke('toggle-server');
      // Try to reconnect socket when server is toggled on
      if (result.running) {
        tryConnectSocket();
      }
      return result;
    },
    
    // Get socket connection status
    getSocketStatus: () => {
      return {
        connected: socket ? socket.connected : false
      };
    },
    
    // Force socket reconnection
    reconnectSocket: () => {
      if (socket) {
        if (socket.connected) {
          socket.disconnect();
        }
        setTimeout(() => socket.connect(), 500);
        return { attempted: true };
      }
      return { attempted: false };
    },
    
    // Generic reverse proxy for any endpoint
    fetchLocal: async (endpoint, options = {}) => {
      return await fetchFromLocalServer(endpoint, options);
    },
    
    // Specific API endpoints
    isDSLRActive: async () => {
      const result = await fetchFromLocalServer('/is-dslr-active');
      return result.ok ? result.data.isActive : false;
    },
    
    capturePhoto: async () => {
      const result = await fetchFromLocalServer('/capture', { method: 'POST' });
      return result;
    },
    
    printPhoto: async (imageStr) => {
      const result = await fetchFromLocalServer('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageStr })
      });
      return result;
    },
    
    addOrderToQueue: async (imagesStr, orderId = null) => {
      console.log(`[Electron Proxy] Adding ${imagesStr.length} images to queue`);
      const result = await fetchFromLocalServer('/api/photo-queue/add-order-to-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagesStr, orderId })
      });
      return result;
    },
    
    createOrder: async (orderId = null) => {
      const result = await fetchFromLocalServer('/api/photo-queue/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
      return result;
    },
    
    retryOrder: async (orderId) => {
      const result = await fetchFromLocalServer('/api/photo-queue/retry-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
      return result;
    },
    
    getOrders: async (filters = {}) => {
      const queryString = new URLSearchParams(filters).toString();
      const endpoint = `/api/photo-queue/orders${queryString ? `?${queryString}` : ''}`;
      const result = await fetchFromLocalServer(endpoint);
      return result;
    },
    
    getOrderById: async (orderId) => {
      const result = await fetchFromLocalServer(`/api/photo-queue/orders/${orderId}`);
      return result;
    }
  };
  
  // Debug methods for DevTools usage
  window.debugPose = {
    createUI: createUI,
    injectUI: () => {
      console.log('Manual UI injection requested via DevTools');
      createUI();
    },
    testAPI: async () => {
      console.log('Testing API endpoints:');
      console.log('isDSLRActive:', await window.poseAPI.isDSLRActive());
      console.log('Socket Status:', window.poseAPI.getSocketStatus());
      console.log('All endpoints should now be accessible via window.poseAPI');
    },
    testEvents: () => {
      console.log('Manually emitting test events');
      // Emit test events
      window.dispatchEvent(new CustomEvent('electron-connection-status', { 
        detail: { connected: true } 
      }));
      window.dispatchEvent(new CustomEvent('electron-liveview', { 
        detail: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVIP/2Q==' 
      }));
      console.log('Test events dispatched');
    },
    // Queue Manager functions
    showQueueManager: () => {
      console.log('Opening Queue Manager...');
      const { showQueueManager } = require('./ui/queueManager');
      showQueueManager();
    },
    hideQueueManager: () => {
      console.log('Closing Queue Manager...');
      const { hideQueueManager } = require('./ui/queueManager');
      hideQueueManager();
    }
  };
}

/**
 * Setup UI injection events
 */
function setupUIInjection() {
  // Try when DOM is ready
  window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded, injecting UI...');
    createUI();
  });
  
  
}

// Start initialization
init();
