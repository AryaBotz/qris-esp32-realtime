app.post("/generate", async (req, res) => {
  try {
    const amount = req.body.amount;

    if (!amount) {
      return res.status(400).json({ error: "amount required" });
    }

    const response = await fetch("https://cashify.my.id/api/generate/qris", {
      method: "POST",
      headers: {
        "x-license-key": process.env.CASHIFY_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        id: process.env.QRIS_ID,
        amount: amount,
        useUniqueCode: true,
        packageIds: ["id.dana"],
        expiredInMinutes: 15
      })
    });

    const json = await response.json();

    if (!json || json.status !== 200) {
      return res.status(500).json({
        error: "Cashify error",
        detail: json
      });
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
