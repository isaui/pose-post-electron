/**
 * UI Module for Pose Photobooth
 * Creates and manages UI elements injected into Next.js app
 */
const { buildContainer } = require('./components/container');
const { buildStatusLabel } = require('./components/statusLabel');
const { buildToggleButton } = require('./components/toggleButton');
const { buildOpenButton } = require('./components/openButton');
const { buildSettingsButton } = require('./components/settings/settingsButton');
const { createSettingsPopup } = require('./components/settings/settingsPopup');
const { createPinDialog } = require('./components/settings/pinDialog');
const { createQueueManager } = require('./queueManager');

/**
 * Creates UI controls for server management
 * Will only create UI if it doesn't already exist
 */
function createUI() {
  console.log('Creating UI controls...');
  
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
      console.log('All endpoints should now be accessible via window.poseAPI');
    },
    // Queue Manager functions
    showQueueManager: () => {
      console.log('Opening Queue Manager...');
      const { showQueueManager } = require('./queueManager');
      showQueueManager();
    },
    hideQueueManager: () => {
      console.log('Closing Queue Manager...');
      const { hideQueueManager } = require('./queueManager');
      hideQueueManager();
    }
  };

  // Don't proceed if document isn't ready
  if (!document.body) {
    console.log('Document body not ready yet');
    return;
  }
  
  // Check if UI already exists to avoid duplicates
  if (document.getElementById('pose-control-panel')) {
    console.log('UI controls already exist');
    return;
  }
  
  console.log('Building UI controls...');
  
  try {
    // Create main container with only settings button
    const container = buildContainer();
    const settingsButton = buildSettingsButton();
    
    // Add only settings button to container
    container.appendChild(settingsButton);
    
    // Add to DOM
    document.body.appendChild(container);
    
    // Create settings popup (hidden by default)
    const settingsPopup = createSettingsPopup();
    document.body.appendChild(settingsPopup);
    
    // Setup event handlers
    setupEventHandlers(settingsButton, settingsPopup);
    
    // Create Queue Manager UI
    createQueueManager();
    
    console.log('UI controls created successfully');
  } catch (error) {
    console.error('Error creating UI controls:', error);
  }
}

/**
 * Setup event handlers for UI elements
 */
function setupEventHandlers(settingsButton, settingsPopup) {
  // Toggle settings popup with PIN protection
  settingsButton.addEventListener('click', async () => {
    const isVisible = settingsPopup.style.display === 'block';
    
    if (!isVisible) {
      // Show PIN dialog for authentication
      const pinDialog = createPinDialog(
        // On successful PIN entry
        async () => {
          // Make visible but transparent for animation
          settingsPopup.style.display = 'block';
          settingsPopup.style.opacity = '0';
          
          // Update server info in the popup before showing
          const serverStatus = await window.poseAPI.getServerStatus();
          
          // Update server status elements in the popup
          const toggleButton = settingsPopup.querySelector('#server-toggle-button');
          const statusLabel = settingsPopup.querySelector('#server-status-label');
          const openButton = settingsPopup.querySelector('#server-open-button');
          
          if (toggleButton && statusLabel && openButton) {
            // Update toggle button
            toggleButton.textContent = serverStatus.running ? 'Stop Server' : 'Start Server';
            toggleButton.style.background = serverStatus.running ? '#cc3333' : '#33aa33';
            
            // Update status label
            statusLabel.textContent = 'Status: ' + (serverStatus.running ? 'Online' : 'Offline');
            
            // Update open button
            openButton.disabled = !serverStatus.running;
            openButton.style.opacity = serverStatus.running ? '1' : '0.5';
            openButton.style.cursor = serverStatus.running ? 'pointer' : 'default';
          }
          
          // Allow the browser to process before starting animation
          setTimeout(() => {
            settingsPopup.style.opacity = '1';
          }, 10);
        },
        // On PIN dialog cancel
        () => {
          console.log('Settings access cancelled');
        }
      );
      
      // Add PIN dialog to DOM
      document.body.appendChild(pinDialog);
    } else {
      // Fade out
      settingsPopup.style.opacity = '0';
      
      // Wait for fade out to complete before hiding
      setTimeout(() => {
        settingsPopup.style.display = 'none';
      }, 200);
    }
  });

  // Close popup when clicking outside
  document.addEventListener('click', (event) => {
    if (!settingsPopup.contains(event.target) && 
        !settingsButton.contains(event.target) && 
        settingsPopup.style.display === 'block') {
      settingsPopup.style.display = 'none';
    }
  });
}

module.exports = {
  createUI
};
