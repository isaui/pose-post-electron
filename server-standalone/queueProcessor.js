/**
 * Queue Processor Manager
 * Manages worker threads untuk memproses order dalam queue
 */
const path = require('path');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { Worker } = require('worker_threads');

// Import services
const orderQueueService = require('./services/photoQueueService');

// Jumlah workers - menggunakan jumlah CPU cores atau fixed number
const NUM_WORKERS = 4;
const workers = [];

// Path ke file worker
const WORKER_FILE = path.join(__dirname, 'queueWorker.js');

// Track active workers and orders being processed
const activeWorkers = new Map(); // workerId -> status
const processingOrders = new Set(); // set of orderIds currently being processed

// Lock untuk mencegah race condition saat check queue
let checkQueueLock = false;



/**
 * Initialize a single worker thread
 * @param {number} workerId - ID for the worker
 */
function initializeWorker(workerId) {
  // Pass env variables explicitly to worker threads
  const worker = new Worker(WORKER_FILE, {
    workerData: { 
      workerId,
      env: {
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
      }
    }
  });
  
  // Store workerId directly on worker object for easy access
  worker.workerId = workerId;
  
  worker.on('message', (message) => {
    if (message.type === 'WORKER_READY') {
      console.log(`✅ Worker ${message.workerId} is ready`);
      activeWorkers.set(worker.workerId, 'idle');
      checkQueue(); // Check for orders to process when a worker becomes available
    } else if (message.type === 'ORDER_RESULT') {
      const { result } = message;
      processingOrders.delete(result.orderId);
      activeWorkers.set(worker.workerId, 'idle');
      
      if (result.success) {
        console.log(`✅ Worker ${worker.workerId} completed order ${result.orderId}`);
      } else {
        console.error(`❌ Worker ${worker.workerId} failed to process order ${result.orderId}: ${result.error}`);
      }
      
      // Look for next order to process
      checkQueue();
    }
  });
  
  worker.on('error', (err) => {
    console.error(`❌ Worker ${workerId} error:`, err);
    // Mark worker as failed and restart it
    activeWorkers.delete(workerId);
    
    // Create a new worker to replace the failed one
    initializeWorker(workerId);
  });
  
  worker.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ Worker ${workerId} exited with code ${code}`);
      activeWorkers.delete(workerId);
      
      // Create a new worker to replace the exited one
      initializeWorker(workerId);
    }
  });
  
  workers[workerId] = worker;
}

/**
 * Initialize worker threads pool
 */
function initializeWorkers() {
  console.log(`⚙️ Initializing ${NUM_WORKERS} worker threads for queue processing`);
  
  for (let i = 0; i < NUM_WORKERS; i++) {
    initializeWorker(i);
  }
}

/**
 * Check the queue and assign orders to idle workers
 */
async function checkQueue() {
  // Check if another queue check is in progress - prevent race conditions
  if (checkQueueLock) {
    return;
  }
  
  // Acquire lock
  checkQueueLock = true;
  
  try {
    // Find idle workers
    const idleWorkerIds = [];
    for (const [workerId, status] of activeWorkers.entries()) {
      if (status === 'idle') {
        idleWorkerIds.push(workerId);
      }
    }
    
    if (idleWorkerIds.length === 0) {
      // No idle workers available
      return;
    }
    
    // Find orders that need processing (status QUEUED)
    const orders = await orderQueueService.getOrdersByStatus('QUEUED', idleWorkerIds.length);
    
    if (orders.length === 0) {
      // No orders to process
      return;
    }
    
    // Assign orders to idle workers
    for (let i = 0; i < Math.min(orders.length, idleWorkerIds.length); i++) {
      const workerId = idleWorkerIds[i];
      const order = orders[i];
      
      // Double-check if this order is already being processed (extra safety)
      if (processingOrders.has(order.id)) {
        continue;
      }
      
      console.log(`⚙️ Assigning order ${order.id} to worker ${workerId}`);
      
      // Mark worker as busy
      activeWorkers.set(workerId, 'busy');
      
      // Mark order as being processed
      processingOrders.add(order.id);
      
      // Send order to worker thread
      workers[workerId].postMessage({
        type: 'PROCESS_ORDER',
        orderId: order.id
      });
    }
  } catch (error) {
    console.error('❌ Error checking queue:', error);
  } finally {
    // Always release lock when done, even if there was an error
    checkQueueLock = false;
  }
}

/**
 * Reset stuck PROCESSING orders back to QUEUED
 * This runs on startup to recover from app crashes/restarts
 */
async function recoverStuckAndErrorOrders() {
  try {
    console.log('🔄 Looking for stuck orders in PROCESSING status...');
    
    // Find orders that are stuck in PROCESSING state
    const processingOrders = await orderQueueService.getOrdersByStatus('PROCESSING');
    const failedOrders = await orderQueueService.getOrdersByStatus('FAILED');
    
    if (processingOrders.length === 0 && failedOrders.length === 0) {
      console.log('✅ No stuck orders found!');
      return;
    }
    
    console.log(`⚠️ Found ${processingOrders.length} stuck orders in PROCESSING status. Resetting to QUEUED...`);
    
    // Reset each order back to QUEUED
    for (const order of [...processingOrders, ...failedOrders]) {
      console.log(`🔄 Resetting order ${order.id} from PROCESSING to QUEUED (was likely interrupted)`);
      await orderQueueService.retryOrder(order.id);
    }
    
    console.log('✅ All stuck and error orders have been reset to QUEUED status');
  } catch (error) {
    console.error('❌ Error recovering stuck orders:', error);
  }
}

/**
 * Add monitoring for orders that stay too long in PROCESSING state
 * This will check every 2 minutes for orders stuck in PROCESSING for more than 5 minutes
 */
async function monitorStuckOrders() {
  try {
    // Find all PROCESSING orders
    const processingOrders = await orderQueueService.getOrdersByStatus('PROCESSING');
    const now = new Date();
    const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes timeout
    
    for (const order of processingOrders) {
      // Check if order has been processing for too long
      const updatedAt = new Date(order.updatedAt);
      const processingTime = now - updatedAt;
      
      if (processingTime > PROCESSING_TIMEOUT_MS) {
        console.log(`⚠️ Order ${order.id} has been PROCESSING for ${processingTime/1000/60} minutes. Resetting to QUEUED.`);
        await orderQueueService.retryOrder(order.id);
      }
    }
  } catch (error) {
    console.error('❌ Error monitoring stuck orders:', error);
  }
}

/**
 * Start the queue processor system
 */
async function start() {
  // First recover any stuck orders from previous sessions
  await recoverStuckAndErrorOrders();
  
  // Initialize worker threads
  initializeWorkers();
  
  // Check queue periodically for new orders
  setInterval(checkQueue, 5000);
  
  // Monitor for stuck orders every 2 minutes
  setInterval(monitorStuckOrders, 2 * 60 * 1000);
  
  console.log('🔄 Queue processor system started with multi-threading and recovery mechanisms');
}

/**
 * Shutdown the queue processor system
 */
function shutdown() {
  console.log('Shutting down queue processor...');
  
  for (const worker of workers) {
    if (worker) {
      worker.terminate();
    }
  }
  
  console.log('Queue processor shutdown complete');
}

module.exports = {
  start,
  shutdown
};
