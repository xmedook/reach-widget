const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const API_URL = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}/messages`;

function normalizePhone(phone) {
  return phone.replace(/[\s\-\+\(\)]/g, "");
}

async function sendWhatsApp(to, message, widgetConfig) {
  const phone = normalizePhone(to);

  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    return {
      success: true,
      actionUrl: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      fallback: true,
    };
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: message },
      }),
    });

    const data = await res.json();

    if (data.messages && data.messages[0]) {
      return { success: true, messageId: data.messages[0].id };
    }

    return { success: false, error: data.error?.message || "Unknown error" };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { sendWhatsApp, normalizePhone };
