const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

// ===================== CONFIG =====================
const LICENSE_KEY = "ISI_LICENSE_KAMU";
const QRIS_ID = "ISI_QRIS_ID_KAMU";

// ===================== MEMORY STATUS =====================
let paymentStatus = "pending";
let lastTransaction = null;

// ===================== ROOT =====================
app.get("/", (req, res) => {
  res.send("QRIS BACKEND ACTIVE");
});

// ===================== STATUS (ESP32 READ HERE) =====================
app.get("/status", (req, res) => {
  res.json({
    status: paymentStatus,
    lastTransaction
  });
});

// ===================== GENERATE QR FROM CASHIFY =====================
app.post("/generate", async (req, res) => {
  try {
    const { amount } = req.body;

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

// ===================== WEBHOOK CASHIFY =====================
app.post("/webhook", (req, res) => {
  try {
    console.log("WEBHOOK IN:", req.body);

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

    console.log("STATUS UPDATE:", paymentStatus);

    res.json({
      success: true
    });

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

// ===================== START SERVER =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🔥 QRIS BACKEND RUNNING ON PORT", PORT);
});
