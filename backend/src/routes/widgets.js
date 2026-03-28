const { Router } = require("express");
const { Pool } = require("pg");

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

router.get("/:token/config", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT name, welcome_message, channels, telegram_bot_username FROM widgets WHERE token = $1 AND active = true",
      [req.params.token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Widget not found" });
    }

    const w = result.rows[0];
    res.json({
      ok: true,
      name: w.name,
      welcome_message: w.welcome_message,
      channels: w.channels,
      telegram_bot_username: w.telegram_bot_username,
    });
  } catch (err) {
    console.error("GET /api/widgets/:token/config error:", err);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, owner_email, welcome_message, whatsapp_number, telegram_bot_token, telegram_bot_username, channels } = req.body;

    if (!name || !owner_email) {
      return res.status(400).json({ ok: false, error: "name and owner_email are required" });
    }

    const result = await pool.query(
      `INSERT INTO widgets (name, owner_email, welcome_message, whatsapp_number, telegram_bot_token, telegram_bot_username, channels)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, token, name, created_at`,
      [
        name,
        owner_email,
        welcome_message || "¿Cómo podemos ayudarte?",
        whatsapp_number || null,
        telegram_bot_token || null,
        telegram_bot_username || null,
        JSON.stringify(channels || ["whatsapp", "sms", "telegram"]),
      ]
    );

    res.status(201).json({ ok: true, widget: result.rows[0] });
  } catch (err) {
    console.error("POST /api/widgets error:", err);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

module.exports = router;
