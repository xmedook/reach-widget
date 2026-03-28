function getTelegramDeepLink(botUsername, leadId) {
  return `https://t.me/${botUsername}?start=lead_${leadId}`;
}

module.exports = { getTelegramDeepLink };
