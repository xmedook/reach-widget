const { Router } = require("express");
const { Pool } = require("pg");
const { sendWhatsApp } = require("../services/whatsapp");
const { sendSMS } = require("../services/sms");
const { getTelegramDeepLink } = require("../services/telegram");
const { sendLeadToGateway } = require("../services/openclaw");

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const PHONE_RE = /^\d{7,15}$/;

router.post("/", async (req, res) => {
  try {
    const { widget_token, phone, country_code, channel, source_url } = req.body;

    if (!widget_token || !phone || !channel) {
      return res.status(400).json({ ok: false, error: "Missing required fields: widget_token, phone, channel" });
    }

    const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
    if (!PHONE_RE.test(cleanPhone)) {
      return res.status(400).json({ ok: false, error: "Invalid phone number" });
    }

    const widgetResult = await pool.query(
      "SELECT * FROM widgets WHERE token = $1 AND active = true",
      [widget_token]
    );

    if (widgetResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Widget not found or inactive" });
    }

    const widget = widgetResult.rows[0];
    const cc = country_code || "+52";
    const fullPhone = `${cc}${cleanPhone}`;
    const message = widget.welcome_message || "¿Cómo podemos ayudarte?";

    const leadResult = await pool.query(
      `INSERT INTO leads (widget_id, phone, country_code, channel, source_url, message_sent)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [widget.id, cleanPhone, cc, channel, source_url || null, message]
    );

    const leadId = leadResult.rows[0].id;
    let actionUrl = null;
    let status = "sent";
    let errorMessage = null;

    if (widget.openclaw_enabled && widget.openclaw_gateway_url) {
      // Ruta OpenClaw: delega toda la comunicación al gateway del cliente
      const result = await sendLeadToGateway(
        {
          gatewayUrl: widget.openclaw_gateway_url,
          gatewayToken: widget.openclaw_gateway_token,
          agentId: widget.openclaw_agent_id,
        },
        { id: leadId, phone: cleanPhone, country_code: cc, channel, sourceUrl: source_url },
        message
      );

      if (result.success) {
        await pool.query(
          "UPDATE leads SET status = 'sent', metadata = metadata || $1, updated_at = NOW() WHERE id = $2",
          [JSON.stringify({ openclaw_session_id: result.sessionId }), leadId]
        );
        res.json({ ok: true, lead_id: leadId, status: "sent", via: "openclaw" });
        return;
      }
      // OpenClaw falló — fallback a canal directo
      console.warn(`[OpenClaw] Fallback to direct channel for lead ${leadId}: ${result.error}`);
    }

    // Ruta directa (Meta API / Twilio / Telegram deep link)
    if (channel === "whatsapp") {
      const result = await sendWhatsApp(fullPhone, message, widget);
      if (result.success) {
        actionUrl = result.actionUrl || `https://wa.me/${fullPhone.replace("+", "")}`;
      } else {
        status = "failed";
        errorMessage = result.error;
      }
    } else if (channel === "sms") {
      const result = await sendSMS(fullPhone, message);
      if (result.success) {
        actionUrl = result.actionUrl || null;
      } else {
        status = "failed";
        errorMessage = result.error;
      }
    } else if (channel === "telegram") {
      if (widget.telegram_bot_username) {
        actionUrl = getTelegramDeepLink(widget.telegram_bot_username, leadId);
      } else {
        status = "failed";
        errorMessage = "Telegram bot not configured for this widget";
      }
    } else if (channel === "imessage") {
      actionUrl = `imessage://+${widget.whatsapp_number || fullPhone.replace("+", "")}`;
    } else {
      status = "failed";
      errorMessage = "Unsupported channel";
    }

    await pool.query(
      "UPDATE leads SET status = $1, error_message = $2, updated_at = NOW() WHERE id = $3",
      [status, errorMessage, leadId]
    );

    res.json({ ok: true, lead_id: leadId, status, action_url: actionUrl });
  } catch (err) {
    console.error("POST /api/leads error:", err);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, error: "Authorization required" });
    }

    const token = auth.slice(7);
    const widgetResult = await pool.query(
      "SELECT id FROM widgets WHERE token = $1",
      [token]
    );

    if (widgetResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Widget not found" });
    }

    const widgetId = widgetResult.rows[0].id;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    const leads = await pool.query(
      "SELECT id, phone, country_code, channel, source_url, status, created_at FROM leads WHERE widget_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [widgetId, limit, offset]
    );

    res.json({ ok: true, leads: leads.rows });
  } catch (err) {
    console.error("GET /api/leads error:", err);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

module.exports = router;
