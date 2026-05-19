const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");

const app = express();
app.use(bodyParser.json());

// ================= FIREBASE INIT =================
admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(process.env.FIREBASE_KEY)
  ),
  databaseURL: "https://esp32-qris-default-rtdb.asia-southeast1.firebasedatabase.app/"
});

const db = admin.database();

// ================= WEBHOOK CASHIFY =================
app.post("/webhook", async (req, res) => {
  try {
    // validasi secret
    const secret = req.headers["x-webhook-secret"];
    if (secret !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // data dari Cashify
    const amount = Number(req.body.amount || 0);
    const status = req.body.status || "paid";
    const txId = req.body.transaction_id || "TX" + Date.now();

    const data = {
      txId,
      status,
      amount,
      timestamp: Date.now()
    };

    // simpan realtime
    await db.ref("transaction/current").set(data);

    // simpan history
    await db.ref("transaction/history/" + txId).set(data);

    console.log("PAYMENT RECEIVED:", data);

    res.json({
      success: true,
      message: "Transaction saved"
    });

  } catch (err) {
    console.error("ERROR WEBHOOK:", err);
    res.status(500).send("Server error");
  }
});

// ================= TEST ENDPOINT =================
app.get("/test", async (req, res) => {
  const testData = {
    txId: "TEST123",
    status: "paid",
    amount: 10000,
    timestamp: Date.now()
  };

  await db.ref("transaction/current").set(testData);

  res.send("TEST OK - Firebase updated");
});

// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("QRIS ESP32 Backend Running");
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🔥 QRIS BACKEND RUNNING ON PORT", PORT);
});
