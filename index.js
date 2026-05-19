const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");

const app = express();
app.use(bodyParser.json());

// ================= FIREBASE INIT SAFE =================
let serviceAccount;

try {
  serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
} catch (e) {
  console.error("FIREBASE_KEY invalid JSON");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://esp32-qris-default-rtdb.asia-southeast1.firebasedatabase.app/"
});

const db = admin.database();

// ================= WEBHOOK CASHIFY =================
app.post("/webhook", async (req, res) => {
  try {
    const secret = req.headers["x-webhook-secret"];

    if (!secret || secret !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const body = req.body;

    const txId = body.transaction_id || body.id || "TX_" + Date.now();

    const data = {
      txId,
      status: body.status || "paid",
      amount: Number(body.amount || 0),
      timestamp: Date.now(),
      raw: body
    };

    await db.ref("transaction/current").set(data);
    await db.ref("transaction/history/" + txId).set(data);

    console.log("PAYMENT RECEIVED:", data);

    res.json({ success: true });

  } catch (err) {
    console.error("WEBHOOK ERROR:", err);
    res.status(500).send("Server error");
  }
});

// ================= TEST =================
app.get("/test", async (req, res) => {
  const testData = {
    txId: "TEST_" + Date.now(),
    status: "paid",
    amount: 10000,
    timestamp: Date.now()
  };

  await db.ref("transaction/current").set(testData);

  res.send("TEST OK");
});

// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("QRIS BACKEND ACTIVE");
});

// ================= START =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("QRIS BACKEND RUNNING:", PORT);
});
