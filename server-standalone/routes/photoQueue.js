/**
 * Order Queue Routes
 * API endpoints for managing orders queue
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const orderQueueService = require('../services/photoQueueService'); // Nama file tetap sama untuk kompatibilitas

// Helper function untuk simpan base64 sebagai file
async function saveBase64Image(base64Data, orderId) {
  // Pastikan direktori ada
  const photosDir = path.join(process.cwd(), 'temp', 'photos');
  if (!fs.existsSync(photosDir)) {
    fs.mkdirSync(photosDir, { recursive: true });
  }

  // Strip the content type prefix if it exists (e.g., "data:image/jpeg;base64,")
  const base64Image = base64Data.split(';base64,').pop();
  
  // Generate filename dengan UUID untuk menghindari tabrakan
  const filename = `${orderId}_${uuidv4()}.jpg`;
  const filePath = path.join(photosDir, filename);
  
  // Simpan ke file
  fs.writeFileSync(filePath, base64Image, { encoding: 'base64' });
  
  return filePath;
}

// GET /api/photo-queue/orders
// Get all orders with pagination and status filtering
router.get('/orders', async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const skip = (page - 1) * limit;
    
    const filters = {
      status: req.query.status,
      skip,
      limit
    };
    
    // Get orders with pagination
    const orders = await orderQueueService.getOrders(filters);
    
    // Get total count for pagination
    const totalCount = await orderQueueService.getOrdersCount(req.query.status);
    
    res.json({
      data: orders,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/photo-queue/orders/:id
// Get an order by ID
router.get('/orders/:id', async (req, res) => {
  try {
    const order = await orderQueueService.getOrder(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});


// POST /api/photo-queue/add-order-to-queue
// Buat order baru dengan foto dan masukkan ke antrian
router.post('/add-order-to-queue', async (req, res) => {
  try {
    const { imagesStr, orderId } = req.body;
    
    if (!imagesStr || !Array.isArray(imagesStr) || imagesStr.length === 0) {
      return res.status(400).json({ error: 'At least one base64 image is required' });
    }
    
    // Buat order baru (dengan ID custom jika disediakan)
    const order = await orderQueueService.createOrder(orderId);
    
    // Proses setiap image base64
    const photoPromises = imagesStr.map(async (base64) => {
      // Simpan base64 ke file
      const filePath = await saveBase64Image(base64, order.id);
      
      // Tambahkan foto ke order (bukan ke queue)
      return orderQueueService.addPhotoToOrder(order.id, filePath, base64);
    });
    
    // Tunggu semua foto selesai diproses
    await Promise.all(photoPromises);
    
    // Order sudah otomatis masuk ke antrian karena status defaultnya QUEUED
    res.status(201).json({ 
      message: "Order successfully added to queue",
      orderId: order.id
    });
  } catch (error) {
    console.error('Error adding order to queue:', error);
    res.status(500).json({ error: 'Failed to add order to queue' });
  }
});

// POST /api/photo-queue/retry-order
// Masukkan kembali order gagal ke antrian
router.post('/retry-order', async (req, res) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }
    
    // Ambil order dengan foto-fotonya
    const order = await orderQueueService.getOrder(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Cek apakah order statusnya FAILED
    if (order.status !== 'FAILED') {
      return res.status(400).json({ 
        error: 'Only FAILED orders can be retried',
        orderStatus: order.status 
      });
    }
    
    // Reset status order ke QUEUED
    await orderQueueService.retryOrder(orderId);
    
    res.json({
      message: "Order successfully added back to queue",
      orderId: order.id
    });
  } catch (error) {
    console.error('Error retrying order:', error);
    res.status(500).json({ error: 'Failed to retry order' });
  }
});

// GET /api/photo-queue/next-order
// Ambil order berikutnya dari antrian untuk diproses
router.get('/next-order', async (req, res) => {
  try {
    const order = await orderQueueService.getNextOrderFromQueue();
    
    if (!order) {
      return res.status(404).json({ error: 'No orders in queue' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error getting next order:', error);
    res.status(500).json({ error: 'Failed to get next order' });
  }
});

// PUT /api/photo-queue/orders/:id/status
// Update status order (setelah selesai diproses)
router.put('/orders/:id/status', async (req, res) => {
  try {
    const { status, error } = req.body;
    
    if (!status || !['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const order = await orderQueueService.updateOrderStatus(req.params.id, status, error);
    
    res.json({
      message: `Order status updated to ${status}`,
      orderId: order.id
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// GET /api/photo-queue/orders/status/:status
// Ambil semua order dengan status tertentu
router.get('/orders/status/:status', async (req, res) => {
  try {
    const status = req.params.status;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    
    if (!['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const orders = await orderQueueService.getOrdersByStatus(status, limit);
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders by status:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

module.exports = router;
