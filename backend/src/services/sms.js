const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER;

async function sendSMS(to, message) {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    return {
      success: true,
      actionUrl: `sms:${to}?body=${encodeURIComponent(message)}`,
      fallback: true,
    };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64");

    const body = new URLSearchParams({
      To: to,
      From: TWILIO_FROM,
      Body: message,
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = await res.json();

    if (data.sid) {
      return { success: true, messageId: data.sid };
    }

    return { success: false, error: data.message || "Unknown error" };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { sendSMS };
