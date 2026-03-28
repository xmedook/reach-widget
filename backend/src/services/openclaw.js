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

    const response = await axios.post(
      `${gatewayUrl}/api/v1/conversations/outbound`,
      {
        agent_id: agentId,
        channel: lead.channel,
        recipient: phone,
        message: message,
        metadata: {
          source: "reach-widget",
          source_url: lead.sourceUrl,
          lead_id: lead.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${gatewayToken}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    return {
      success: true,
      sessionId: response.data?.session_id || response.data?.id,
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
 */
async function pingGateway(gatewayUrl, gatewayToken) {
  const start = Date.now();
  try {
    const res = await axios.get(`${gatewayUrl}/api/v1/health`, {
      headers: { Authorization: `Bearer ${gatewayToken}` },
      timeout: 5000,
    });
    return { ok: true, version: res.data?.version, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, error: err.message, latencyMs: Date.now() - start };
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

module.exports = { sendLeadToGateway, pingGateway };
