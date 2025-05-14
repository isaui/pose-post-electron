/**
 * Settings popup component for the Pose control panel
 */

/**
 * Create settings popup element with modern styling
 * @returns {HTMLElement} Settings popup
 */
function createSettingsPopup() {
  const popup = document.createElement('div');
  popup.id = 'pose-settings-popup';
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(30, 30, 30, 0.95);
    color: white;
    padding: 18px;
    border-radius: 12px;
    z-index: 9998;
    width: 450px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(12px);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: none;
    opacity: 0;
    transition: opacity 0.2s ease;
  `;

  // No custom animation needed for a simple fade

  // Create header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  `;

  const title = document.createElement('h3');
  title.textContent = 'Pose Server Settings';
  title.style.cssText = `
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  `;

  const closeButton = document.createElement('button');
  closeButton.innerHTML = '&times;';
  closeButton.style.cssText = `
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s ease;
  `;
  
  closeButton.onmouseover = () => {
    closeButton.style.color = 'rgba(255, 255, 255, 1)';
    closeButton.style.background = 'rgba(255, 255, 255, 0.1)';
  };
  
  closeButton.onmouseout = () => {
    closeButton.style.color = 'rgba(255, 255, 255, 0.6)';
    closeButton.style.background = 'none';
  };
  
  closeButton.onclick = () => {
    popup.style.display = 'none';
  };

  header.appendChild(title);
  header.appendChild(closeButton);
  popup.appendChild(header);

  // Create tab bar
  const tabBar = document.createElement('div');
  tabBar.style.cssText = `
    display: flex;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    margin-bottom: 15px;
  `;
  
  // Create server tab (active by default)
  const serverTab = document.createElement('div');
  serverTab.textContent = 'Server';
  serverTab.dataset.tab = 'server';
  serverTab.className = 'active-tab';
  serverTab.style.cssText = `
    padding: 8px 16px;
    cursor: pointer;
    font-weight: 500;
    color: white;
    border-bottom: 2px solid #3399ff;
    transition: all 0.2s ease;
  `;
  
  // Create admin tab
  const adminTab = document.createElement('div');
  adminTab.textContent = 'Admin';
  adminTab.dataset.tab = 'admin';
  adminTab.className = 'inactive-tab';
  adminTab.style.cssText = `
    padding: 8px 16px;
    cursor: pointer;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.6);
    border-bottom: 2px solid transparent;
    transition: all 0.2s ease;
  `;
  
  // Add style for tabs 
  const style = document.createElement('style');
  style.textContent = `
    .inactive-tab {
      padding: 8px 16px;
      cursor: pointer;
      font-weight: 400;
      color: rgba(255, 255, 255, 0.6);
      border-bottom: 2px solid transparent;
      transition: all 0.2s ease;
    }
    .inactive-tab:hover {
      color: rgba(255, 255, 255, 0.9);
      background: rgba(255, 255, 255, 0.05);
    }
    
    .admin-action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 16px;
      background: #4F94FF;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      margin-top: 12px;
      transition: all 0.2s ease;
    }
    
    .admin-action-btn:hover {
      background: #60A0FF;
      transform: translateY(-1px);
    }
    
    .admin-action-btn.danger {
      background: #ff5252;
    }
    
    .admin-action-btn.danger:hover {
      background: #ff6b6b;
    }
  `;
  document.head.appendChild(style);
  
  // Add server tab to tab bar
  tabBar.appendChild(serverTab);
  tabBar.appendChild(adminTab);
  popup.appendChild(tabBar);

  // Create content container for tabs
  const tabContent = document.createElement('div');
  tabContent.id = 'tab-content';
  popup.appendChild(tabContent);

  // Create server tab content (initially visible)
  const serverTabContent = document.createElement('div');
  serverTabContent.id = 'server-tab-content';
  serverTabContent.style.cssText = `
    display: block;
  `;
  tabContent.appendChild(serverTabContent);

  // Create server status section
  const serverStatusSection = document.createElement('div');
  serverStatusSection.style.cssText = `
    margin-bottom: 20px;
    background: rgba(0, 0, 0, 0.2);
    padding: 15px;
    border-radius: 8px;
  `;

  // Create status label
  const statusLabel = document.createElement('div');
  statusLabel.id = 'server-status-label';
  statusLabel.textContent = 'Status: Offline';
  statusLabel.style.cssText = `
    font-weight: 500;
    font-size: 14px;
    margin-bottom: 12px;
  `;
  serverStatusSection.appendChild(statusLabel);
  
  // Create server controls container
  const controlsContainer = document.createElement('div');
  controlsContainer.style.cssText = `
    display: flex;
    gap: 10px;
  `;
  
  // Create toggle button
  const toggleButton = document.createElement('button');
  toggleButton.id = 'server-toggle-button';
  toggleButton.textContent = 'Start Server';
  toggleButton.style.cssText = `
    flex: 1;
    padding: 8px 12px;
    background: #33aa33;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    font-size: 13px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  toggleButton.onmouseover = () => { 
    if (!toggleButton.disabled) {
      toggleButton.style.filter = 'brightness(1.1)';
    }
  };
  
  toggleButton.onmouseout = () => { 
    if (!toggleButton.disabled) {
      toggleButton.style.filter = 'brightness(1)';
    }
  };
  
  toggleButton.onclick = async () => {
    try {
      toggleButton.disabled = true;
      await window.poseAPI.toggleServer();
      
      // Update UI after toggling
      const serverStatus = await window.poseAPI.getServerStatus();
      
      // Update toggle button
      toggleButton.textContent = serverStatus.running ? 'Stop Server' : 'Start Server';
      toggleButton.style.background = serverStatus.running ? '#cc3333' : '#33aa33';
      
      // Update status label
      statusLabel.textContent = 'Status: ' + (serverStatus.running ? 'Online' : 'Offline');
      
      // Update open button
      openButton.disabled = !serverStatus.running;
      openButton.style.opacity = serverStatus.running ? '1' : '0.5';
      openButton.style.cursor = serverStatus.running ? 'pointer' : 'default';
      
      // Update queue manager button
      queueManagerButton.disabled = !serverStatus.running;
      queueManagerButton.style.opacity = serverStatus.running ? '1' : '0.5';
      queueManagerButton.style.cursor = serverStatus.running ? 'pointer' : 'default';
      queueManagerButton.style.background = serverStatus.running ? '#3399ff' : '#666';
      
      // Update server info
      updateServerInfo(serverStatus);
    } catch (err) {
      console.error('Error toggling server:', err);
    } finally {
      toggleButton.disabled = false;
    }
  };
  
  // Create open button
  const openButton = document.createElement('button');
  openButton.id = 'server-open-button';
  openButton.textContent = '🌐 Open';
  openButton.style.cssText = `
    padding: 8px 12px;
    background: #555;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    font-size: 13px;
    transition: all 0.2s ease;
    opacity: 0.5;
  `;
  
  openButton.onmouseover = () => { 
    if (!openButton.disabled) {
      openButton.style.filter = 'brightness(1.1)';
    }
  };
  
  openButton.onmouseout = () => { 
    if (!openButton.disabled) {
      openButton.style.filter = 'brightness(1)';
    }
  };
  
  openButton.onclick = () => {
    window.open('http://localhost:9000/api/status', '_blank');
  };
  
  controlsContainer.appendChild(toggleButton);
  controlsContainer.appendChild(openButton);
  serverStatusSection.appendChild(controlsContainer);
  
  serverTabContent.appendChild(serverStatusSection);
  
  // Create queue manager section
  const queueManagerSection = document.createElement('div');
  queueManagerSection.style.cssText = `
    margin-bottom: 20px;
    background: rgba(0, 0, 0, 0.2);
    padding: 15px;
    border-radius: 8px;
  `;
  
  // Create section header
  const queueHeader = document.createElement('div');
  queueHeader.textContent = 'Queue Management';
  queueHeader.style.cssText = `
    font-weight: 500;
    font-size: 14px;
    margin-bottom: 12px;
    color: rgba(255, 255, 255, 0.8);
  `;
  queueManagerSection.appendChild(queueHeader);
  
  // Create queue manager button
  const queueManagerButton = document.createElement('button');
  queueManagerButton.id = 'queue-manager-button';
  queueManagerButton.style.cssText = `
    background: #3399ff;
    border: none;
    border-radius: 6px;
    color: white;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    cursor: default;
    transition: all 0.2s ease;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    opacity: 0.5;
  `;
  
  // Initially disabled - will be enabled when server is running
  queueManagerButton.disabled = true;
  
  // Add icon to button
  queueManagerButton.innerHTML = '<span>🖼️</span> <span>Open Queue Manager</span>';
  
  // Add hover effect
  queueManagerButton.onmouseover = () => {
    if (!queueManagerButton.disabled) {
      queueManagerButton.style.background = '#007bff';
    }
  };
  
  queueManagerButton.onmouseout = () => {
    if (!queueManagerButton.disabled) {
      queueManagerButton.style.background = '#3399ff';
    }
  };
  
  // Add to section
  queueManagerSection.appendChild(queueManagerButton);
  
  // Add event listener to open Queue Manager
  queueManagerButton.onclick = () => {
    // Close settings popup
    popup.style.display = 'none';
    
    // Show queue manager
    if (window.debugPose && typeof window.debugPose.showQueueManager === 'function') {
      window.debugPose.showQueueManager();
    } else {
      console.error('Queue Manager function not available');
    }
  };
  
  serverTabContent.appendChild(queueManagerSection);
  // Create server info section
  const serverInfoSection = document.createElement('div');
  serverInfoSection.style.cssText = `
    margin-bottom: 15px;
  `;

  // Create section title
  const sectionTitle = document.createElement('h4');
  sectionTitle.textContent = 'Server Information';
  sectionTitle.style.cssText = `
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
  `;

  const serverInfo = document.createElement('div');
  serverInfo.id = 'server-info';
  serverInfo.style.cssText = `
    background: rgba(0, 0, 0, 0.2);
    padding: 12px;
    border-radius: 8px;
    font-size: 13px;
    line-height: 1.5;
  `;
  
  // Default content, will be updated when opened
  serverInfo.innerHTML = `
    <div><strong>Port:</strong> 9000</div>
    <div><strong>URL:</strong> http://localhost:9000</div>
  `;

  // Function to update server info
  function updateServerInfo(serverStatus) {
    serverInfo.innerHTML = `
      <div><strong>Port:</strong> ${serverStatus.port || 9000}</div>
      <div><strong>URL:</strong> http://localhost:${serverStatus.port || 9000}</div>
    `;
  }

  serverInfoSection.appendChild(sectionTitle);
  serverInfoSection.appendChild(serverInfo);
  serverTabContent.appendChild(serverInfoSection);

  // Create footer with refresh button
  const footer = document.createElement('div');
  footer.style.cssText = `
    display: flex;
    justify-content: flex-end;
    margin-top: 15px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  `;

  const refreshButton = document.createElement('button');
  refreshButton.textContent = 'Refresh Status';
  refreshButton.style.cssText = `
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: white;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
  `;
  
  refreshButton.onmouseover = () => {
    refreshButton.style.background = 'rgba(255, 255, 255, 0.2)';
  };
  
  refreshButton.onmouseout = () => {
    refreshButton.style.background = 'rgba(255, 255, 255, 0.1)';
  };
  
  refreshButton.onclick = async () => {
    try {
      const serverStatus = await window.poseAPI.getServerStatus();
      
      // Update toggle button
      toggleButton.textContent = serverStatus.running ? 'Stop Server' : 'Start Server';
      toggleButton.style.background = serverStatus.running ? '#cc3333' : '#33aa33';
      
      // Update status label
      statusLabel.textContent = 'Status: ' + (serverStatus.running ? 'Online' : 'Offline');
      
      // Update open button
      openButton.disabled = !serverStatus.running;
      openButton.style.opacity = serverStatus.running ? '1' : '0.5';
      openButton.style.cursor = serverStatus.running ? 'pointer' : 'default';
      
      // Update queue manager button
      queueManagerButton.disabled = !serverStatus.running;
      queueManagerButton.style.opacity = serverStatus.running ? '1' : '0.5';
      queueManagerButton.style.cursor = serverStatus.running ? 'pointer' : 'default';
      queueManagerButton.style.background = serverStatus.running ? '#3399ff' : '#666';
      
      // Update server info
      updateServerInfo(serverStatus);
    } catch (err) {
      console.error('Error refreshing server info:', err);
      serverInfo.innerHTML = `<div>Error fetching server information</div>`;
    }
  };

  footer.appendChild(refreshButton);
  popup.appendChild(footer);

  // Create admin content
  const adminContent = document.createElement('div');
  adminContent.dataset.tabContent = 'admin';
  adminContent.style.cssText = `
    display: none; /* Hidden by default */
  `;

  // Admin panel title
  const adminTitle = document.createElement('h4');
  adminTitle.textContent = 'Admin Actions';
  adminTitle.style.cssText = `
    margin: 0 0 15px 0;
    font-size: 15px;
    font-weight: 600;
  `;
  adminContent.appendChild(adminTitle);

  // Admin panel description
  const adminDescription = document.createElement('p');
  adminDescription.textContent = 'These actions are restricted to administrators only.';
  adminDescription.style.cssText = `
    margin: 0 0 20px 0;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
  `;
  adminContent.appendChild(adminDescription);

  // Payment bypass section
  const paymentSection = document.createElement('div');
  paymentSection.style.cssText = `
    margin-bottom: 20px;
    padding: 15px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    border-left: 3px solid #ff9800;
  `;

  // Payment section title
  const paymentTitle = document.createElement('h5');
  paymentTitle.textContent = 'Payment Controls';
  paymentTitle.style.cssText = `
    margin: 0 0 10px 0;
    font-size: 14px;
    font-weight: 600;
    color: #ff9800;
  `;
  paymentSection.appendChild(paymentTitle);

  // Payment section description
  const paymentDesc = document.createElement('p');
  paymentDesc.textContent = 'Use these controls to manage payment flow for special cases.';
  paymentDesc.style.cssText = `
    margin: 0 0 15px 0;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
  `;
  paymentSection.appendChild(paymentDesc);

  // Create bypass payment button
  const bypassPaymentBtn = document.createElement('button');
  bypassPaymentBtn.className = 'admin-action-btn';
  bypassPaymentBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
    Bypass Payment
  `;

  // Add click event to bypass payment button
  bypassPaymentBtn.addEventListener('click', () => {
    // Create and dispatch custom event for Next.js to listen
    const bypassEvent = new CustomEvent('pose-payment-bypass', {
      detail: {
        timestamp: Date.now(),
        authorized: true
      }
    });
    
    // Dispatch to window for Next.js to listen
    window.dispatchEvent(bypassEvent);
    
    // Visual feedback
    bypassPaymentBtn.textContent = 'Payment Bypassed!';
    bypassPaymentBtn.style.background = '#4CAF50';
    
    // Reset button after 2 seconds
    setTimeout(() => {
      bypassPaymentBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <line x1="2" y1="10" x2="22" y2="10"/>
        </svg>
        Bypass Payment
      `;
      bypassPaymentBtn.style.background = '#4F94FF';
    }, 2000);
    
    console.log('Payment bypass triggered by admin');
  });

  paymentSection.appendChild(bypassPaymentBtn);
  adminContent.appendChild(paymentSection);

  // Logout section
  const logoutSection = document.createElement('div');
  logoutSection.style.cssText = `
    margin-bottom: 20px;
    padding: 15px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    border-left: 3px solid #ff5252;
  `;

  // Logout section title
  const logoutTitle = document.createElement('h5');
  logoutTitle.textContent = 'Account';
  logoutTitle.style.cssText = `
    margin: 0 0 10px 0;
    font-size: 14px;
    font-weight: 600;
    color: #ff5252;
  `;
  logoutSection.appendChild(logoutTitle);

  // Logout section description
  const logoutDesc = document.createElement('p');
  logoutDesc.textContent = 'Sign out from your current session.';
  logoutDesc.style.cssText = `
    margin: 0 0 15px 0;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
  `;
  logoutSection.appendChild(logoutDesc);

  // Create logout button
  const logoutBtn = document.createElement('button');
  logoutBtn.className = 'admin-action-btn danger';
  logoutBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
    Logout
  `;

  // Add click event to logout button
  logoutBtn.addEventListener('click', () => {
    // Create and dispatch a logout event
    const logoutEvent = new CustomEvent('logout', {
      bubbles: true,
      detail: {
        timestamp: Date.now()
      }
    });
    
    // Dispatch the event
    window.dispatchEvent(logoutEvent);
    
    // Close the popup
    popup.style.display = 'none';
    
    console.log('Logout event emitted');
  });

  logoutSection.appendChild(logoutBtn);
  adminContent.appendChild(logoutSection);

  // Add server and admin content to popup
  popup.appendChild(serverTabContent);
  popup.appendChild(adminContent);

  // Tab switching logic
  serverTab.addEventListener('click', () => {
    // Update tab active states
    serverTab.className = 'active-tab';
    serverTab.style.color = 'white';
    serverTab.style.borderBottom = '2px solid #3399ff';
    
    adminTab.className = 'inactive-tab';
    adminTab.style.color = 'rgba(255, 255, 255, 0.6)';
    adminTab.style.borderBottom = '2px solid transparent';
    
    // Show/hide content
    serverTabContent.style.display = 'block';
    adminContent.style.display = 'none';
  });
  
  adminTab.addEventListener('click', () => {
    // Update tab active states
    adminTab.className = 'active-tab';
    adminTab.style.color = 'white';
    adminTab.style.borderBottom = '2px solid #3399ff';
    
    serverTab.className = 'inactive-tab';
    serverTab.style.color = 'rgba(255, 255, 255, 0.6)';
    serverTab.style.borderBottom = '2px solid transparent';
    
    // Show/hide content
    adminContent.style.display = 'block';
    serverTabContent.style.display = 'none';
  });

  // Add version text at the bottom
  const versionText = document.createElement('div');
  versionText.textContent = 'Version 1.0.2';
  versionText.style.cssText = `
    text-align: center;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 15px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  `;
  popup.appendChild(versionText);

  return popup;
}

module.exports = {
  createSettingsPopup
};
