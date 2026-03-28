const { Router } = require("express");
const { Pool } = require("pg");
const { pingGateway } = require("../services/openclaw");

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

router.get("/:token/config", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT name, welcome_message, channels, telegram_bot_username, openclaw_enabled FROM widgets WHERE token = $1 AND active = true",
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
      openclaw_enabled: w.openclaw_enabled || false,
    });
  } catch (err) {
    console.error("GET /api/widgets/:token/config error:", err);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      name, owner_email, welcome_message, whatsapp_number,
      telegram_bot_token, telegram_bot_username, channels,
      openclaw_gateway_url, openclaw_gateway_token, openclaw_agent_id, openclaw_enabled,
    } = req.body;

    if (!name || !owner_email) {
      return res.status(400).json({ ok: false, error: "name and owner_email are required" });
    }

    // Verificar conectividad con gateway OpenClaw si está habilitado
    let gatewayStatus = null;
    if (openclaw_enabled && openclaw_gateway_url) {
      const ping = await pingGateway(openclaw_gateway_url, openclaw_gateway_token);
      gatewayStatus = ping.ok ? "connected" : "unreachable";
    }

    const result = await pool.query(
      `INSERT INTO widgets (name, owner_email, welcome_message, whatsapp_number, telegram_bot_token, telegram_bot_username, channels, openclaw_gateway_url, openclaw_gateway_token, openclaw_agent_id, openclaw_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, token, name, created_at`,
      [
        name,
        owner_email,
        welcome_message || "¿Cómo podemos ayudarte?",
        whatsapp_number || null,
        telegram_bot_token || null,
        telegram_bot_username || null,
        JSON.stringify(channels || ["whatsapp", "sms", "telegram"]),
        openclaw_gateway_url || null,
        openclaw_gateway_token || null,
        openclaw_agent_id || null,
        openclaw_enabled || false,
      ]
    );

    const response = { ok: true, widget: result.rows[0] };
    if (gatewayStatus) response.gatewayStatus = gatewayStatus;

    res.status(201).json(response);
  } catch (err) {
    console.error("POST /api/widgets error:", err);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// Test gateway connectivity
router.post("/:token/test-gateway", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT openclaw_gateway_url, openclaw_gateway_token FROM widgets WHERE token = $1",
      [req.params.token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Widget not found" });
    }

    const widget = result.rows[0];
    if (!widget.openclaw_gateway_url) {
      return res.status(400).json({ ok: false, error: "OpenClaw gateway not configured for this widget" });
    }

    const ping = await pingGateway(widget.openclaw_gateway_url, widget.openclaw_gateway_token);
    res.json(ping);
  } catch (err) {
    console.error("POST /api/widgets/:token/test-gateway error:", err);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

module.exports = router;
