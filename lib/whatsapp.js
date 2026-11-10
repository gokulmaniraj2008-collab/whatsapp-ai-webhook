async function sendWhatsAppText({ to, text, phoneNumberId }) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const configuredPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v23.0";

  if (!token || !configuredPhoneNumberId) {
    throw Object.assign(new Error("WhatsApp is not configured"), { code: "WHATSAPP_NOT_CONFIGURED" });
  }
  // Use the phone-number ID from the signed webhook only when it matches
  // the configured sender, preventing replies from an unexpected number.
  if (phoneNumberId !== configuredPhoneNumberId) {
    throw Object.assign(new Error("Unexpected WhatsApp phone number ID"), { code: "WHATSAPP_PHONE_ID_MISMATCH" });
  }

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${configuredPhoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body: String(text).slice(0, 4000) }
      }),
      signal: AbortSignal.timeout(6500)
    }
  );

  if (!response.ok) {
    const error = new Error("WhatsApp send request failed");
    error.code = `WHATSAPP_HTTP_${response.status}`;
    throw error;
  }
  return response.json();
}

module.exports = { sendWhatsAppText };
