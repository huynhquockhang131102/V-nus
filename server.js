const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('.'));

// MoMo Configuration
const MOMO_CONFIG = {
  partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO',
  accessKey: process.env.MOMO_ACCESS_KEY || 'F8BF47D1BC160DFF6B3B6C6FF657430C',
  secretKey: process.env.MOMO_SECRET_KEY || 'NFcpIflJiIhUvrNQstXQyP0yDMSeD3mB',
  endpoint: 'https://test-payment.momo.vn/v2/gateway/api/create',
  redirectUrl: process.env.MOMO_REDIRECT_URL || 'http://localhost:3000/payment-result',
  ipnUrl: process.env.MOMO_IPN_URL || 'http://localhost:3000/payment-notify'
};

// Helper function to sign request
function signRequest(data) {
  const rawSignature = `accessKey=${data.accessKey}&amount=${data.amount}&extraData=${data.extraData}&ipnUrl=${data.ipnUrl}&orderId=${data.orderId}&orderInfo=${data.orderInfo}&partnerCode=${data.partnerCode}&redirectUrl=${data.redirectUrl}&requestId=${data.requestId}&requestType=${data.requestType}`;
  const signature = crypto.createHmac('sha256', MOMO_CONFIG.secretKey)
    .update(rawSignature)
    .digest('hex');
  return signature;
}

// API endpoint to create MoMo payment
app.post('/api/create-payment', async (req, res) => {
  try {
    const { amount, orderId, orderInfo, customerName, customerPhone, customerEmail } = req.body;

    // Validate input
    if (!amount || !orderId || !orderInfo) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const requestId = Date.now().toString();
    const extraData = Buffer.from(JSON.stringify({
      customerName,
      customerPhone,
      customerEmail
    })).toString('base64');

    const requestBody = {
      partnerCode: MOMO_CONFIG.partnerCode,
      requestId,
      orderId,
      amount,
      orderInfo,
      redirectUrl: MOMO_CONFIG.redirectUrl,
      ipnUrl: MOMO_CONFIG.ipnUrl,
      requestType: 'captureWallet',
      signature: '',
      extraData,
      accessKey: MOMO_CONFIG.accessKey,
      lang: 'vi'
    };

    // Sign the request
    requestBody.signature = signRequest(requestBody);

    // Call MoMo API
    const response = await axios.post(MOMO_CONFIG.endpoint, requestBody, {
      headers: { 'Content-Type': 'application/json' }
    });

    res.json({
      success: response.data.resultCode === 0,
      paymentUrl: response.data.payUrl,
      data: response.data
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create payment',
      message: error.message 
    });
  }
});

// Callback endpoint for payment result
app.get('/payment-result', (req, res) => {
  const { resultCode, orderId, message, amount } = req.query;
  
  if (resultCode === '0') {
    res.send(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thanh toán thành công</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
          }
          .success-container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          }
          .checkmark {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: #4CAF50;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 50px;
          }
          h1 { color: #333; margin: 20px 0; }
          p { color: #666; margin: 10px 0; }
          .order-id { font-weight: bold; color: #667eea; }
          .amount { font-size: 24px; color: #4CAF50; font-weight: bold; }
          a { 
            display: inline-block;
            margin-top: 20px;
            padding: 10px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <div class="success-container">
          <div class="checkmark">✓</div>
          <h1>Thanh toán thành công!</h1>
          <p>Cảm ơn bạn đã mua hàng</p>
          <p class="order-id">Mã đơn hàng: ${orderId}</p>
          <p class="amount">${Number(amount).toLocaleString('vi-VN')} ₫</p>
          <p>${message}</p>
          <a href="http://localhost:3000">← Quay lại trang chủ</a>
        </div>
      </body>
      </html>
    `);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thanh toán thất bại</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            margin: 0;
          }
          .error-container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          }
          .x-mark {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: #f5576c;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 50px;
            color: white;
          }
          h1 { color: #333; margin: 20px 0; }
          p { color: #666; margin: 10px 0; }
          a { 
            display: inline-block;
            margin-top: 20px;
            padding: 10px 30px;
            background: #f5576c;
            color: white;
            text-decoration: none;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <div class="error-container">
          <div class="x-mark">✕</div>
          <h1>Thanh toán thất bại</h1>
          <p>${message}</p>
          <a href="http://localhost:3000">← Quay lại trang chủ</a>
        </div>
      </body>
      </html>
    `);
  }
});

// IPN endpoint for server-to-server notification
app.post('/payment-notify', (req, res) => {
  const { orderId, amount, resultCode, message } = req.body;
  
  console.log('Payment IPN notification:', {
    orderId,
    amount,
    resultCode,
    message
  });

  // Process payment result (update database, send email, etc.)
  if (resultCode === 0) {
    console.log('Payment successful for order:', orderId);
    // TODO: Update order status in database
  }

  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('MoMo Payment Gateway configured');
});
