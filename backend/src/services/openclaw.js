const axios = require("axios");

/**
 * Envía un nuevo lead al gateway OpenClaw del cliente
 *
 * @param {Object} config - { gatewayUrl, gatewayToken, agentId }
 * @param {Object} lead - { id, phone, channel, sourceUrl, country_code }
 * @param {string} welcomeMessage - Mensaje de bienvenida del widget
 * @returns {Promise<{success: boolean, sessionId?: string, error?: string}>}
 */
async function sendLeadToGateway(config, lead, welcomeMessage) {
  const { gatewayUrl, gatewayToken, agentId } = config;

  try {
    const phone = normalizePhone(lead.phone, lead.country_code || "+52");
    const message = buildWelcomeMessage(welcomeMessage, lead);

    // sessionKey para WhatsApp: número en E.164 + @whatsapp
    // Para Telegram: el username o chat_id + @telegram
    const sessionKey = buildSessionKey(phone, lead.channel);

    // OpenClaw gateway expone POST /tools/invoke
    // sessions_send debe estar en gateway.tools.allow del cliente
    // Config requerida en openclaw.json del cliente:
    //   { "gateway": { "tools": { "allow": ["sessions_send"] } } }
    const response = await axios.post(
      `${gatewayUrl}/tools/invoke`,
      {
        tool: "sessions_send",
        sessionKey: sessionKey,
        args: {
          message: message,
          label: agentId || undefined,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${gatewayToken}`,
          "Content-Type": "application/json",
          // Hints de canal para que el gateway resuelva bien el contexto
          "x-openclaw-message-channel": lead.channel,
        },
        timeout: 10000,
      }
    );

    if (!response.data?.ok) {
      throw new Error(response.data?.error?.message || "Gateway returned ok=false");
    }

    return {
      success: true,
      sessionKey,
      raw: response.data,
    };
  } catch (err) {
    const errMsg = err.response?.data?.message || err.message;
    console.error(`[OpenClaw] Gateway error: ${errMsg}`);
    return { success: false, error: errMsg };
  }
}

/**
 * Verifica conectividad con un gateway OpenClaw
 * Usa el health check del gateway: GET /health
 */
async function pingGateway(gatewayUrl, gatewayToken) {
  const start = Date.now();
  try {
    const res = await axios.get(`${gatewayUrl}/health`, {
      headers: { Authorization: `Bearer ${gatewayToken}` },
      timeout: 5000,
    });
    return { ok: true, version: res.data?.version, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, error: err.message, latencyMs: Date.now() - start };
  }
}

/**
 * Construye el sessionKey para OpenClaw según el canal
 * WhatsApp: +521234567890@whatsapp (DM colapsado al agente main por default)
 * Telegram: número o username — OpenClaw lo resuelve internamente
 */
function buildSessionKey(phone, channel) {
  switch (channel) {
    case "whatsapp":
      return `${phone}@whatsapp`;
    case "telegram":
      // Telegram usa chat_id; si solo tenemos teléfono usamos el número
      // El agente debe tener el canal telegram configurado
      return `${phone}@telegram`;
    case "sms":
      // SMS no tiene sesión OpenClaw nativa — usar canal directo
      return null;
    default:
      return `${phone}@${channel}`;
  }
}

function normalizePhone(phone, countryCode) {
  const digits = phone.replace(/\D/g, "");
  const prefix = countryCode.replace("+", "");
  if (digits.startsWith(prefix)) return `+${digits}`;
  return `+${prefix}${digits}`;
}

function buildWelcomeMessage(template, lead) {
  return template
    .replace("{phone}", lead.phone)
    .replace("{source}", lead.sourceUrl ? new URL(lead.sourceUrl).hostname : "tu sitio web")
    .replace("{channel}", lead.channel);
}

module.exports = { sendLeadToGateway, pingGateway, buildSessionKey };
