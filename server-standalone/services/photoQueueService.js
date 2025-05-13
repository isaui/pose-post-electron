/**
 * Order Queue Service
 * Handles database operations for orders in queue and their photos
 */
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
const path = require('path');

/**
 * Create a new order
 * 
 * @param {string} [orderId] - Optional custom order ID for tracking
 * @returns {Promise<Object>} Created order with QUEUED status
 */
async function createOrder(orderId) {
  return prisma.order.create({
    data: {
      id: orderId || undefined, // Gunakan custom ID jika disediakan, atau biarkan Prisma generate UUID
      status: 'QUEUED',
      retryCount: 0,
      error: null
    }
  });
}

/**
 * Get an order by ID
 * 
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Order with photos
 */
async function getOrderById(orderId) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: { photos: true }
  });
}

/**
 * Get all orders with optional filters
 * 
 * @param {Object} filters - Filter options (status, limit, skip, etc)
 * @returns {Promise<Array>} List of orders
 */
async function getOrders(filters = {}) {
  const where = {};
  
  if (filters.status) {
    where.status = filters.status;
  }
  
  return prisma.order.findMany({
    where,
    include: { photos: true },
    orderBy: { createdAt: 'desc' },
    skip: filters.skip || 0,
    take: filters.limit || 10
  });
}

/**
 * Get count of orders with optional status filter
 * 
 * @param {string} status - Optional status filter
 * @returns {Promise<number>} Count of orders
 */
async function getOrdersCount(status) {
  const where = {};
  
  if (status) {
    where.status = status;
  }
  
  return prisma.order.count({ where });
}



/**
 * Add a photo to an order
 * 
 * @param {string} orderId - Order ID
 * @param {string} filePath - Path to the photo file in Supabase storage
 * @param {string} [publicUrl] - Optional public URL for the uploaded file
 * @returns {Promise<Object>} Created photo
 */
async function addPhotoToOrder(orderId, filePath, publicUrl = null) {
  return prisma.photo.create({
    data: {
      orderId,
      filePath,
      publicUrl
    }
  });
}

/**
 * Update order status
 * 
 * @param {string} orderId - Order ID 
 * @param {string} status - New status (QUEUED, PROCESSING, COMPLETED, FAILED)
 * @param {string} [error] - Error message if status is FAILED
 * @returns {Promise<Object>} Updated order
 */
async function updateOrderStatus(orderId, status, error = null) {
  const data = { status };
  
  // Jika status adalah FAILED, simpan error message
  if (status === 'FAILED' && error) {
    data.error = error;
  }
  
  // Jika status adalah PROCESSING, increment retryCount
  if (status === 'PROCESSING') {
    // Ambil data order untuk increment retryCount
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });
    
    if (order) {
      data.retryCount = order.retryCount + 1;
    }
  }
  
  // Jika status adalah COMPLETED, hapus error
  if (status === 'COMPLETED') {
    data.error = null;
  }
  
  return prisma.order.update({
    where: { id: orderId },
    data
  });
}

/**
 * Get next order to process from queue
 * 
 * @returns {Promise<Object>} Next order with QUEUED status, or null if queue is empty
 */
async function getNextOrderFromQueue() {
  return prisma.order.findFirst({
    where: { status: 'QUEUED' },
    include: { photos: true },
    orderBy: { createdAt: 'asc' }
  });
}

/**
 * Get all orders with specified status
 * 
 * @param {string} status - Order status (QUEUED, PROCESSING, COMPLETED, FAILED)
 * @param {number} limit - Max number of orders to return
 * @returns {Promise<Array>} List of orders with the specified status
 */
async function getOrdersByStatus(status, limit = 10) {
  return prisma.order.findMany({
    where: { status },
    include: { photos: true },
    orderBy: { createdAt: 'asc' },
    take: limit
  });
}

/**
 * Retry a failed order
 * 
 * @param {string} orderId - Order ID to retry
 * @returns {Promise<Object>} Updated order with QUEUED status
 */
async function retryOrder(orderId) {
  return prisma.order.update({
    where: { id: orderId },
    data: { 
      status: 'QUEUED',
      error: null
    }
  });
}

module.exports = {
  createOrder,
  getOrderById,
  getOrders,
  getOrdersCount,
  updateOrderStatus,
  addPhotoToOrder,
  getNextOrderFromQueue,
  getOrdersByStatus,
  retryOrder
};
