const express = require("express");
const app = express();

app.use(express.json());

// ================= ENV =================
const CASHIFY_KEY = process.env.CASHIFY_KEY;
const QRIS_ID = process.env.QRIS_ID;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

// ================= STATE =================
let paymentStatus = "pending";
let lastTransaction = null;

// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("QRIS BACKEND ACTIVE");
});

// ================= TEST =================
app.get("/test", (req, res) => {
  res.json({ ok: true });
});

// ================= STATUS (ESP32 POLLING) =================
app.get("/status", (req, res) => {
  res.json({
    status: paymentStatus,
    lastTransaction
  });
});

// ================= GENERATE REAL CASHIFY =================
app.post("/generate", async (req, res) => {
  try {
    const amount = req.body.amount;

    if (!amount) {
      return res.status(400).json({
        error: "amount required"
      });
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

        // 🔥 MULTI WALLET (FIX KAMU)
        packageIds: [
          "id.dana",
          "id.ovo",
          "id.gopay",
          "id.shopee",
          "id.linkaja"
        ],

        expiredInMinutes: 15
      })
    });

    const json = await response.json();

    console.log("CASHIFY RESPONSE:", JSON.stringify(json, null, 2));

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

    res.json({
      transactionId: data.transactionId,
      qr_string: data.qr_string,
      totalAmount: data.totalAmount
    });

  } catch (err) {
    console.log("ERROR:", err.message);

    res.status(500).json({
      error: "server error",
      message: err.message
    });
  }
});

// ================= WEBHOOK =================
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

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🔥 QRIS PRODUCTION READY ON PORT", PORT);
});
