const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

// ===================== STATUS GLOBAL =====================
let paymentStatus = "pending";
let lastTransaction = null;

// ===================== ROOT =====================
app.get("/", (req, res) => {
  res.send("QRIS BACKEND ACTIVE");
});

// ===================== STATUS FOR ESP32 =====================
app.get("/status", (req, res) => {
  res.json({
    status: paymentStatus,
    lastTransaction
  });
});

// ===================== WEBHOOK CASHIFY =====================
app.post("/webhook", (req, res) => {
  try {
    console.log("WEBHOOK IN:", req.body);

    const status = req.body.status || "pending";
    const amount = req.body.amount || 0;
    const txId = req.body.transaction_id || "TX" + Date.now();

    // update global status
    paymentStatus = status;

    lastTransaction = {
      txId,
      status,
      amount,
      time: Date.now()
    };

    console.log("PAYMENT UPDATE:", lastTransaction);

    res.json({
      success: true,
      message: "Webhook received"
    });

  } catch (err) {
    console.error("WEBHOOK ERROR:", err);
    res.status(500).json({ error: "server error" });
  }
});

// ===================== TEST ENDPOINT =====================
app.get("/test", (req, res) => {
  paymentStatus = "paid";

  res.json({
    message: "TEST OK",
    status: paymentStatus
  });
});

// ===================== START SERVER =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🔥 QRIS BACKEND RUNNING ON PORT", PORT);
});
