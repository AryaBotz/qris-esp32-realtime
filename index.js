const express = require("express");
const app = express();

app.use(express.json());

// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("QRIS BACKEND ACTIVE");
});

// ================= STATUS =================
let paymentStatus = "pending";
let lastTransaction = null;

app.get("/status", (req, res) => {
  res.json({
    status: paymentStatus,
    lastTransaction
  });
});

// ================= GENERATE (DUMMY dulu biar tidak crash) =================
app.post("/generate", (req, res) => {
  const { amount } = req.body || {};

  if (!amount) {
    return res.status(400).json({ error: "amount required" });
  }

  const transactionId = "TX" + Date.now();

  lastTransaction = {
    transactionId,
    amount,
    status: "pending"
  };

  paymentStatus = "pending";

  res.json({
    transactionId,
    qr_string: "DUMMY_QR_" + transactionId,
    totalAmount: amount + 3
  });
});

// ================= WEBHOOK (TEST MODE) =================
app.post("/webhook", (req, res) => {
  const { status, amount, transaction_id } = req.body || {};

  paymentStatus = status || "pending";

  lastTransaction = {
    txId: transaction_id || "UNKNOWN",
    status: status || "pending",
    amount: amount || 0,
    time: Date.now()
  };

  console.log("WEBHOOK RECEIVED:", lastTransaction);

  res.json({ success: true });
});

// ================= TEST =================
app.get("/test", (req, res) => {
  res.json({ ok: true });
});

// ================= START =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🔥 SERVER RUNNING ON PORT", PORT);
});
