const express = require("express");
const app = express();

app.use(express.json());

// ENV
const CASHIFY_KEY = process.env.CASHIFY_KEY;
const QRIS_ID = process.env.QRIS_ID;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

// STATE
let paymentStatus = "pending";
let lastTransaction = null;

// ROOT
app.get("/", (req, res) => {
  res.send("QRIS BACKEND ACTIVE");
});

// STATUS
app.get("/status", (req, res) => {
  res.json({
    status: paymentStatus,
    lastTransaction
  });
});

// GENERATE QRIS
app.post("/generate", async (req, res) => {
  try {
    const amount = req.body.amount;

    if (!amount) {
      return res.status(400).json({ error: "amount required" });
    }

    const response = await fetch("https://cashify.my.id/api/generate/qris", {
      method: "POST",
      headers: {
        "x-license-key": CASHIFY_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        id: QRIS_ID,
        amount: amount,
        useUniqueCode: true,
        packageIds: ["id.dana", "id.ovo", "id.gopay"],
        expiredInMinutes: 15
      })
    });

    const json = await response.json();

    console.log("CASHIFY RESPONSE:", json);

    if (!json || json.status !== 200) {
      return res.status(500).json({
        error: "Cashify failed",
        debug: json
      });
    }

    const data = json.data;

    lastTransaction = {
      transactionId: data.transactionId,
      amount: data.totalAmount,
      status: "pending",
      createdAt: Date.now()
    };

    paymentStatus = "pending";

    return res.json({
      transactionId: data.transactionId,
      qr_string: data.qr_string,
      totalAmount: data.totalAmount
    });

  } catch (err) {
    console.log("ERROR:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// WEBHOOK
app.post("/webhook", (req, res) => {
  const secret = req.headers["x-webhook-secret"];

  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const { status, amount, transaction_id } = req.body;

  paymentStatus = status;

  lastTransaction = {
    transactionId: transaction_id,
    amount,
    status,
    updatedAt: Date.now()
  };

  console.log("PAYMENT UPDATE:", lastTransaction);

  res.json({ success: true });
});

// START
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🔥 QRIS BACKEND RUNNING ON", PORT);
});
