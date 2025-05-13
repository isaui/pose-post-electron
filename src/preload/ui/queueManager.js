/**
 * Queue Manager UI Component
 * Adds a side panel to monitor and manage photo processing queue
 */
const { ipcRenderer } = require('electron');

// Styles for Queue Manager UI
const style = `

.queue-manager-panel {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 450px;
  background-color: #1a1a1a;
  color: #ffffff;
  z-index: 9998;
  box-shadow: -5px 0 15px rgba(0,0,0,0.5);
  padding: 20px;
  overflow-y: auto;
  transition: transform 0.3s ease;
  transform: translateX(100%);
}

.queue-manager-panel.open {
  transform: translateX(0);
}

.queue-manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 15px;
}

.queue-manager-title {
  font-size: 20px;
  font-weight: bold;
  color: #ffffff;
}

.queue-manager-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.6);
}

.queue-manager-close:hover {
  color: rgba(255, 255, 255, 1);
}

.queue-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.queue-filter-button {
  padding: 5px 12px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background-color: rgba(0, 0, 0, 0.3);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
}

.queue-filter-button.active {
  background-color: #3399ff;
  color: white;
  border-color: #3399ff;
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.queue-item {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 16px;
  background-color: rgba(0, 0, 0, 0.2);
}

.queue-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.queue-item-id {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.queue-item-status {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-QUEUED {
  background-color: #dbeafe;
  color: #2563eb;
}

.status-PROCESSING {
  background-color: #fef3c7;
  color: #d97706;
}

.status-COMPLETED {
  background-color: #dcfce7;
  color: #16a34a;
}

.status-FAILED {
  background-color: #fee2e2;
  color: #dc2626;
}

.queue-item-details {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 12px;
}

.queue-item-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.queue-action-button {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.retry-button {
  background-color: #3399ff;
  color: white;
  border: none;
}

.retry-button:hover {
  background-color: #007bff;
}

.view-button {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.view-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.queue-empty {
  text-align: center;
  padding: 40px 0;
  color: rgba(255, 255, 255, 0.5);
}

.queue-loading {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(0,0,0,0.1);
  border-radius: 50%;
  border-top-color: #2563eb;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.photo-thumbnail {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
  margin-right: 8px;
}

.photo-thumbnails {
  display: flex;
  overflow-x: auto;
  margin-top: 8px;
  padding-bottom: 8px;
}

.refresh-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.refresh-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}
`;

/**
 * Create the Queue Manager panel without a tab button
 * Will be triggered from the settings popup
 */
function createQueueManager() {
  // Check if it's already in the DOM
  if (document.querySelector('.queue-manager-panel')) {
    return document.querySelector('.queue-manager-panel');
  }
  
  // Add styles
  const styleEl = document.createElement('style');
  styleEl.textContent = style;
  document.head.appendChild(styleEl);
  
  // Create panel
  const panelEl = document.createElement('div');
  panelEl.className = 'queue-manager-panel';
  panelEl.innerHTML = `
    <div class="queue-manager-header">
      <div class="queue-manager-title">Photo Queue Manager</div>
      <button class="queue-manager-close">&times;</button>
    </div>
    
    <div class="queue-filters">
      <button class="queue-filter-button active" data-status="all">All</button>
      <button class="queue-filter-button" data-status="QUEUED">Queued</button>
      <button class="queue-filter-button" data-status="PROCESSING">Processing</button>
      <button class="queue-filter-button" data-status="COMPLETED">Completed</button>
      <button class="queue-filter-button" data-status="FAILED">Failed</button>
      <button class="refresh-button">
        <span>🔄</span>
        <span>Refresh</span>
      </button>
    </div>
    
    <div class="queue-list">
      <div class="queue-loading">
        <div class="spinner"></div>
      </div>
    </div>
  `;
  document.body.appendChild(panelEl);
  
  // Close panel
  panelEl.querySelector('.queue-manager-close').addEventListener('click', () => {
    panelEl.classList.remove('open');
  });
  
  // Handle filter clicks
  const filterButtons = panelEl.querySelectorAll('.queue-filter-button');
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Update active state
      filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Load orders with filter
      loadOrders(button.dataset.status === 'all' ? null : button.dataset.status);
    });
  });
  
  // Handle refresh button
  panelEl.querySelector('.refresh-button').addEventListener('click', () => {
    const activeFilter = panelEl.querySelector('.queue-filter-button.active');
    const status = activeFilter ? (activeFilter.dataset.status === 'all' ? null : activeFilter.dataset.status) : null;
    loadOrders(status);
  });
  
  // Initial load
  if (panelEl.classList.contains('open')) {
    loadOrders();
  }

  return panelEl;
}

// Load orders from the server
async function loadOrders(status = null) {
  const queueList = document.querySelector('.queue-list');
  
  // Show loading state
  queueList.innerHTML = '<div class="queue-loading"><div class="spinner"></div></div>';
  
  try {
    // Prepare query parameters
    const params = new URLSearchParams();
    if (status) {
      params.append('status', status);
    }
    
    // Fetch orders from API
    const response = await window.poseAPI.getOrders(status ? { status } : {});
    
    if (!response.ok) {
      throw new Error('Failed to fetch orders');
    }
    
    const { data } = response.data;
    
    // Clear loading state
    queueList.innerHTML = '';
    
    if (data.length === 0) {
      queueList.innerHTML = '<div class="queue-empty">No orders found</div>';
      return;
    }
    
    // Render each order
    data.forEach(order => {
      const orderEl = document.createElement('div');
      orderEl.className = 'queue-item';
      
      // Format date
      const createdAt = new Date(order.createdAt).toLocaleString();
      const updatedAt = new Date(order.updatedAt).toLocaleString();
      
      // Create HTML for the order
      orderEl.innerHTML = `
        <div class="queue-item-header">
          <div class="queue-item-id">${order.id}</div>
          <div class="queue-item-status status-${order.status}">${order.status}</div>
        </div>
        <div class="queue-item-details">
          <div>Created: ${createdAt}</div>
          <div>Last Updated: ${updatedAt}</div>
        </div>
        <div class="photo-thumbnails">
          ${order.photos.map(photo => 
            photo.publicUrl ? 
            `<img src="${photo.publicUrl}" class="photo-thumbnail" alt="Order photo" />` :
            `<div class="photo-thumbnail" style="background-color: #e2e8f0; display: flex; align-items: center; justify-content: center;">No URL</div>`
          ).join('')}
        </div>
        <div class="queue-item-actions">
          ${order.status === 'FAILED' ? '<button class="queue-action-button retry-button" data-order-id="' + order.id + '">Retry</button>' : ''}
        </div>
      `;
      
      queueList.appendChild(orderEl);
    });
    
    // Add event listeners for retry buttons
    const retryButtons = queueList.querySelectorAll('.retry-button');
    retryButtons.forEach(button => {
      button.addEventListener('click', async () => {
        const orderId = button.dataset.orderId;
        button.textContent = 'Retrying...';
        button.disabled = true;
        
        try {
          const response = await window.poseAPI.retryOrder(orderId);
          
          if (!response.ok) {
            throw new Error('Failed to retry order');
          }
          
          // Refresh the list
          loadOrders(status);
        } catch (error) {
          console.error('Error retrying order:', error);
          button.textContent = 'Retry Failed';
          setTimeout(() => {
            button.textContent = 'Retry';
            button.disabled = false;
          }, 2000);
        }
      });
    });
    
  } catch (error) {
    console.error('Error loading orders:', error);
    queueList.innerHTML = '<div class="queue-empty">Error loading orders</div>';
  }
}

/**
 * Show the Queue Manager panel and load orders
 */
function showQueueManager() {
  const panel = createQueueManager();
  panel.classList.add('open');
  loadOrders();
}

/**
 * Hide the Queue Manager panel
 */
function hideQueueManager() {
  const panel = document.querySelector('.queue-manager-panel');
  if (panel) {
    panel.classList.remove('open');
  }
}

module.exports = { createQueueManager, showQueueManager, hideQueueManager };
