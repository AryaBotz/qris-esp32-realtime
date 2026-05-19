const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");

const app = express();
app.use(bodyParser.json());

// ===== SAFE FIREBASE INIT =====
let serviceAccount;

try {
  serviceAccount = JSON.parse(process.env.FIREBASE_KEY || "{}");
} catch (err) {
  console.error("Invalid FIREBASE_KEY JSON");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://esp32-qris-default-rtdb.asia-southeast1.firebasedatabase.app/"
});

const db = admin.database();

// ===== WEBHOOK CASHIFY =====
app.post("/webhook", async (req, res) => {
  try {
    const secret = req.headers["x-webhook-secret"];

    if (secret !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const body = req.body || {};

    // normalize data
    const txId = String(body.transaction_id || body.id || Date.now());
    const amount = Number(body.amount || 0);
    const status = String(body.status || "paid");

    const data = {
      txId,
      amount,
      status,
      timestamp: Date.now()
    };

    // prevent Firebase illegal key
    const safeTxId = txId.replace(/[.#$/\[\]]/g, "_");

    // atomic write
    await db.ref("transaction/current").set(data);
    await db.ref("transaction/history/" + safeTxId).set(data);

    console.log("PAYMENT OK:", data);

    res.json({ success: true });

  } catch (err) {
    console.error("WEBHOOK ERROR:", err);
    res.status(500).send("error");
  }
});

// ===== TEST =====
app.get("/test", async (req, res) => {
  const test = {
    txId: "TEST_" + Date.now(),
    amount: 10000,
    status: "paid",
    timestamp: Date.now()
  };

  await db.ref("transaction/current").set(test);

  res.send("OK");
});

// ===== ROOT =====
app.get("/", (req, res) => {
  res.send("QRIS BACKEND ACTIVE");
});

// ===== START =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("RUNNING ON PORT", PORT);
});
