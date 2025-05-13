/**
 * Queue Worker - Process orders in background
 * Integrasi dengan Supabase untuk upload gambar
 */
const { PrismaClient } = require('./generated/prisma');
const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

// Supabase config - diambil dari workerData yang dikirim dari main thread
const supabaseUrl = workerData.env?.SUPABASE_URL || process.env.SUPABASE_URL || 'https://your-supabase-url.supabase.co';
const supabaseKey = workerData.env?.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'your-anon-key';

console.log(`[Worker ${workerData.workerId}] Initializing with Supabase URL: ${supabaseUrl}`);
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Upload gambar ke Supabase Storage
 * @param {string} filePath - Path ke file lokal
 * @returns {Promise<{filePath: string, publicUrl: string}>} - Path dan URL publik di Supabase
 */
async function uploadImageToSupabase(filePath) {
  try {
    // Baca file sebagai buffer
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = `orders/${uuidv4()}${path.extname(filePath)}`;

    // Upload ke Supabase storage
    const { data, error } = await supabase.storage
      .from('reflect') // Bucket name
      .upload(fileName, fileBuffer, {
        contentType: 'image/jpeg', // Sesuaikan dengan tipe file yang benar
      });

    if (error) {
      console.error(`[Worker ${workerData.workerId}] Supabase upload error:`, error);
      throw error;
    }

    // Dapatkan public URL
    const { data: urlData } = supabase.storage
      .from('reflect')
      .getPublicUrl(fileName);

    return {
      filePath: fileName,
      publicUrl: urlData.publicUrl
    };
  } catch (error) {
    console.error(`[Worker ${workerData.workerId}] Upload error:`, error);
    throw error;
  }
}

// Process order function
async function processOrder(orderId) {
  try {
    // Update order to PROCESSING
    await prisma.order.update({
      where: { id: orderId },
      data: { 
        status: 'PROCESSING',
        retryCount: { increment: 1 }
      }
    });

    // Get order with photos
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { photos: true }
    });

    console.log(`[Worker ${workerData.workerId}] Processing order ${orderId} with ${order.photos.length} photos`);

    // Proses foto secara paralel dengan Promise.all
    console.log(`[Worker ${workerData.workerId}] Processing ${order.photos.length} photos in parallel`);
    
    const photoProcessingPromises = order.photos.map(async (photo) => {
      try {
        // Jika foto belum punya publicUrl, upload ke Supabase
        if (!photo.publicUrl) {
          console.log(`[Worker ${workerData.workerId}] Uploading image to Supabase: ${photo.filePath}`);
          
          // Upload ke Supabase
          const { filePath, publicUrl } = await uploadImageToSupabase(photo.filePath);
          
          // Update record di database
          await prisma.photo.update({
            where: { id: photo.id },
            data: { 
              filePath,
              publicUrl 
            }
          });
          
          return { id: photo.id, filePath, publicUrl, success: true };
        } else {
          return { ...photo, success: true };
        }
      } catch (photoError) {
        console.error(`[Worker ${workerData.workerId}] Error processing photo ${photo.id}:`, photoError);
        return { id: photo.id, success: false, error: photoError.message };
      }
    });
    
    // Tunggu semua proses upload foto selesai
    const processedPhotos = await Promise.all(photoProcessingPromises);
    
    // Filter foto yang berhasil diproses dan ambil publicUrls untuk disimpan di order
    const successfulPhotos = processedPhotos.filter(photo => photo.success);
    const publicUrls = successfulPhotos
      .map(photo => photo.publicUrl)
      .filter(url => url !== undefined && url !== null); // Filter URL yang valid
    
    // Cek apakah semua foto berhasil diproses atau tidak
    const allPhotosSuccessful = successfulPhotos.length === processedPhotos.length;
    const orderStatus = allPhotosSuccessful ? 'COMPLETED' : 'FAILED';
    let errorMessage = null;
    
    // Jika ada foto yang gagal, catat error-nya
    if (!allPhotosSuccessful) {
      const failedPhotos = processedPhotos.filter(photo => !photo.success);
      errorMessage = `${failedPhotos.length} photos failed to process. ${successfulPhotos.length} photos were processed successfully.`;
      console.warn(`[Worker ${workerData.workerId}] Order ${orderId} partially completed: ${errorMessage}`);
    }

    // Update status order di Prisma
    await prisma.order.update({
      where: { id: orderId },
      data: { 
        status: orderStatus, 
        error: errorMessage
      }
    });
    
    // Update data di tabel orders Supabase (hanya jika ID ada)
    if (orderId) {
      try {
        // Cek apakah order sudah ada di Supabase dengan order ID
        const { data: existingOrder, error: fetchError } = await supabase
          .from('orders')
          .select('id, status, image_urls')
          .eq('id', orderId)
          .maybeSingle();
        
        if (fetchError) {
          console.error(`[Worker ${workerData.workerId}] Error checking Supabase order:`, fetchError);
          throw new Error("Failed check order. Cant connect to supabase")
        }
        
        if (existingOrder) {
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              image_urls: publicUrls,
              is_upload_completed: allPhotosSuccessful
            })
            .eq('id', orderId);
            
          if (updateError) {
            console.error(`[Worker ${workerData.workerId}] Error updating Supabase order:`, updateError);
            throw new Error("Failed update order. Cant connect to supabase")
          } else {
            console.log(`[Worker ${workerData.workerId}] Successfully updated order in Supabase: images=${publicUrls.length}`);
          }
        } else {
          console.log(`[Worker ${workerData.workerId}] No matching order found in Supabase with ID: ${orderId}`);
        }
      } catch (supabaseError) {
        console.error(`[Worker ${workerData.workerId}] Error syncing with Supabase:`, supabaseError);
        await prisma.order.update({
          where: { id: orderId },
          data: { 
            status: 'FAILED', 
            error: supabaseError?.message
          }
        });

      }
    }

    if (allPhotosSuccessful) {
      console.log(`[Worker ${workerData.workerId}] Order ${orderId} completed successfully`);
      return { success: true, orderId, processedPhotos, publicUrls };
    } else {
      console.log(`[Worker ${workerData.workerId}] Order ${orderId} partially completed (${successfulPhotos.length}/${processedPhotos.length} photos)`);
      return { 
        success: false, 
        partial: true,
        orderId, 
        processedPhotos, 
        publicUrls,
        error: errorMessage 
      };
    }
  } catch (error) {
    console.error(`[Worker ${workerData.workerId}] Failed to process order ${orderId}:`, error);
    
    // Mark as failed
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'FAILED', error: error.message }
    });
    return { success: false, orderId, error: error.message };
  }
}

// Listen for messages from the main thread
parentPort.on('message', async (message) => {
  if (message.type === 'PROCESS_ORDER') {
    try {
      const result = await processOrder(message.orderId);
      parentPort.postMessage({ type: 'ORDER_RESULT', result });
    } catch (error) {
      parentPort.postMessage({ 
        type: 'ORDER_RESULT', 
        result: { 
          success: false, 
          orderId: message.orderId, 
          error: error.message 
        } 
      });
    }
  }
});

// Signal that worker is ready
parentPort.postMessage({ type: 'WORKER_READY', workerId: workerData.workerId });

// Handle process termination
process.on('SIGTERM', () => {
  console.log(`[Worker ${workerData.workerId}] Terminating gracefully`);
  prisma.$disconnect();
  process.exit(0);
});
