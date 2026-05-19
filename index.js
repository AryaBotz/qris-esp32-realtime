const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

// Initialize Express app
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize Firebase Admin SDK
const firebaseKey = process.env.FIREBASE_KEY;
if (!firebaseKey) {
  console.error('ERROR: FIREBASE_KEY environment variable is not set');
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(firebaseKey);
} catch (error) {
  console.error('ERROR: Failed to parse FIREBASE_KEY as JSON', error.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://esp32-qris-default-rtdb.asia-southeast1.firebasedatabase.app/'
});

const db = admin.database();

// Webhook Secret
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
if (!WEBHOOK_SECRET) {
  console.warn('WARNING: WEBHOOK_SECRET environment variable is not set. Webhook validation will be skipped.');
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Test endpoint - untuk testing update Firebase
app.get('/test', async (req, res) => {
  try {
    const testData = {
      status: 'paid',
      amount: 10000,
      timestamp: Date.now()
    };

    // Update current transaction
    await db.ref('transaction/current').set(testData);

    // Add to history
    await db.ref(`transaction/history/${testData.timestamp}`).set(testData);

    console.log('[TEST] Transaction update:', testData);

    res.status(200).json({
      success: true,
      message: 'Test transaction created successfully',
      data: testData
    });
  } catch (error) {
    console.error('[TEST ERROR]', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Webhook endpoint - menerima data dari payment gateway (Cashify)
app.post('/webhook', async (req, res) => {
  try {
    // Validasi header x-webhook-secret
    const webhookSecret = req.headers['x-webhook-secret'];

    if (WEBHOOK_SECRET && webhookSecret !== WEBHOOK_SECRET) {
      console.warn('[WEBHOOK] Unauthorized request - invalid secret');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const payload = req.body;

    // Validasi struktur data minimal
    if (!payload.status || typeof payload.amount !== 'number') {
      console.warn('[WEBHOOK] Invalid payload structure', payload);
      return res.status(400).json({
        success: false,
        error: 'Invalid payload structure'
      });
    }

    // Tambahkan timestamp jika belum ada
    const transaction = {
      status: payload.status,
      amount: payload.amount,
      timestamp: payload.timestamp || Date.now()
    };

    console.log('[WEBHOOK] Transaction received:', transaction);

    // Update current transaction di Firebase
    await db.ref('transaction/current').set(transaction);

    // Tambahkan ke history
    await db.ref(`transaction/history/${transaction.timestamp}`).set(transaction);

    res.status(200).json({
      success: true,
      message: 'Webhook received and processed',
      data: transaction
    });
  } catch (error) {
    console.error('[WEBHOOK ERROR]', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('[ERROR]', error.message);
  res.status(500).json({
    success: false,
    error: error.message
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[SERVER] QRIS Realtime Backend started on port ${PORT}`);
  console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('[SERVER] Ready to receive webhook from payment gateway');
});
