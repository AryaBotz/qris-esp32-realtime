const express = require("express");
const app = express();

app.use(express.json());

const LICENSE_KEY = process.env.CASHIFY_KEY;
const QRIS_ID = process.env.QRIS_ID;

// MEMORY STATUS
let paymentStatus = "pending";
let lastTransaction = null;

// ROOT
app.get("/", (req, res) => {
  res.send("QRIS BACKEND ACTIVE");
});

// STATUS (ESP32 POLLING)
app.get("/status", (req, res) => {
  res.json({
    status: paymentStatus,
    lastTransaction
  });
});

// REAL CASHIFY GENERATE
app.post("/generate", async (req, res) => {
  try {
    const amount = req.body.amount;

    if (!amount) {
      return res.status(400).json({ error: "amount required" });
    }

    const response = await fetch("https://cashify.my.id/api/generate/qris", {
      method: "POST",
      headers: {
        "x-license-key": LICENSE_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        id: QRIS_ID,
        amount: amount,
        useUniqueCode: true,
        packageIds: ["id.dana"],
        expiredInMinutes: 15
      })
    });

    const json = await response.json();

    if (!json || json.status !== 200) {
      console.log(json);
      return res.status(500).json({ error: "Cashify failed" });
    }

    const data = json.data;

    lastTransaction = {
      transactionId: data.transactionId,
      amount: data.totalAmount,
      status: "pending",
      time: Date.now()
    };

    paymentStatus = "pending";

    res.json({
      transactionId: data.transactionId,
      qr_string: data.qr_string,
      totalAmount: data.totalAmount
    });

  } catch (err) {
    console.log("ERROR:", err.message);
    res.status(500).json({ error: "server error" });
  }
});

// WEBHOOK (OPTIONAL REAL TIME UPDATE)
app.post("/webhook", (req, res) => {
  const { status, amount, transaction_id } = req.body;

  paymentStatus = status;

  lastTransaction = {
    transactionId: transaction_id,
    amount,
    status,
    time: Date.now()
  };

  console.log("PAYMENT UPDATE:", lastTransaction);

  res.json({ ok: true });
});

// START SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🔥 REAL QRIS BACKEND RUNNING ON", PORT);
});
