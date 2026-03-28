const { Router } = require("express");
const { Pool } = require("pg");

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// WhatsApp webhook verification (Meta requires GET for challenge)
router.get("/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// WhatsApp incoming message webhook
router.post("/whatsapp", async (req, res) => {
  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (message) {
      const from = message.from;
      // Update lead status to "replied" if we find a matching phone
      await pool.query(
        "UPDATE leads SET status = 'replied', updated_at = NOW() WHERE phone = $1 AND status IN ('sent', 'delivered') ORDER BY created_at DESC LIMIT 1",
        [from]
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(200);
  }
});

// Telegram webhook for bot start commands
router.post("/telegram", async (req, res) => {
  try {
    const message = req.body?.message;
    if (message?.text?.startsWith("/start lead_")) {
      const leadId = message.text.replace("/start lead_", "");
      await pool.query(
        "UPDATE leads SET status = 'replied', updated_at = NOW() WHERE id = $1",
        [leadId]
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Telegram webhook error:", err);
    res.sendStatus(200);
  }
});

module.exports = router;
