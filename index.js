const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

// ===================== ENV =====================
const LICENSE_KEY = process.env.CASHIFY_KEY;
const QRIS_ID = process.env.QRIS_ID;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

// ===================== MEMORY =====================
let paymentStatus = "pending";
let lastTransaction = null;

// ===================== ROOT =====================
app.get("/", (req, res) => {
  res.send("QRIS BACKEND ACTIVE");
});

// ===================== STATUS (ESP32) =====================
app.get("/status", (req, res) => {
  res.json({
    status: paymentStatus,
    lastTransaction
  });
});

// ===================== GENERATE QR =====================
app.post("/generate", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "amount required" });
    }

    const response = await axios.post(
      "https://cashify.my.id/api/generate/qris",
      {
        id: QRIS_ID,
        amount: amount,
        useUniqueCode: true,
        packageIds: ["id.dana"],
        expiredInMinutes: 15
      },
      {
        headers: {
          "x-license-key": LICENSE_KEY,
          "content-type": "application/json"
        }
      }
    );

    const data = response.data.data;

    lastTransaction = {
      txId: data.transactionId,
      status: "pending",
      amount: data.totalAmount,
      time: Date.now()
    };

    paymentStatus = "pending";

    res.json({
      transactionId: data.transactionId,
      qr_string: data.qr_string,
      totalAmount: data.totalAmount
    });

  } catch (err) {
    console.log("GENERATE ERROR:", err.response?.data || err.message);
    res.status(500).json({ error: "generate failed" });
  }
});

// ===================== WEBHOOK SECURITY =====================
app.post("/webhook", (req, res) => {
  try {
    const secret = req.headers["x-webhook-secret"];

    // 🔐 SECURITY CHECK
    if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
      return res.status(401).json({ error: "unauthorized webhook" });
    }

    const status = req.body.status || "pending";
    const amount = req.body.amount || 0;
    const txId = req.body.transaction_id || "TX" + Date.now();

    paymentStatus = status;

    lastTransaction = {
      txId,
      status,
      amount,
      time: Date.now()
    };

    console.log("PAYMENT UPDATE:", lastTransaction);

    res.json({ success: true });

  } catch (err) {
    console.log("WEBHOOK ERROR:", err);
    res.status(500).json({ error: "server error" });
  }
});

// ===================== TEST =====================
app.get("/test", (req, res) => {
  paymentStatus = "paid";

  res.json({
    status: paymentStatus,
    message: "TEST OK"
  });
});

// ===================== START =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🔥 SECURE QRIS BACKEND RUNNING ON PORT", PORT);
});
