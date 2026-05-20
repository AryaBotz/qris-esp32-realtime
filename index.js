app.post("/generate", async (req, res) => {
  try {
    const amount = req.body.amount;

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
        packageIds: ["id.dana", "id.ovo", "id.gopay"],
        expiredInMinutes: 15
      })
    });

    const json = await response.json();

    console.log("CASHIFY RESPONSE:", json);

    if (!json || json.status !== 200) {
      return res.status(500).json(json);
    }

    const data = json.data;

    return res.json({
      transactionId: data.transactionId,
      qr_string: data.qr_string,
      totalAmount: data.totalAmount
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});
