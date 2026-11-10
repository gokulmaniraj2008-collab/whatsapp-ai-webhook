const crypto = require("node:crypto");
const { generateReply } = require("../lib/gemini");
const { sendWhatsAppText } = require("../lib/whatsapp");

// Keep the raw request body for Meta's HMAC signature verification.
module.exports.config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function safeEqualText(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function extractTextMessages(event) {
  const messages = [];
  for (const entry of event?.entry || []) {
    for (const change of entry?.changes || []) {
      const value = change?.value || {};
      const phoneNumberId = value?.metadata?.phone_number_id;
      for (const message of value?.messages || []) {
        if (message?.type === "text" && message?.text?.body && message?.from && phoneNumberId) {
          messages.push({
            id: message.id,
            from: message.from,
            text: message.text.body,
            phoneNumberId
          });
        }
      }
    }
  }
  return messages;
}

module.exports = async function webhook(req, res) {
  if (req.method === "GET") {
    const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expected = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === "subscribe" && expected && safeEqualText(token || "", expected) && challenge) {
      res.status(200).setHeader("Content-Type", "text/plain");
      return res.end(challenge);
    }
    return res.status(403).send("Webhook verification failed");
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).send("Method Not Allowed");
  }

  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return res.status(503).json({ error: "Webhook is not configured" });

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch {
    return res.status(400).json({ error: "Could not read request body" });
  }

  const signature = req.headers["x-hub-signature-256"];
  const expectedSignature = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  if (typeof signature !== "string" || !safeEqualText(signature, expectedSignature)) {
    return res.status(401).json({ error: "Invalid webhook signature" });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "Invalid JSON payload" });
  }

  if (event?.object !== "whatsapp_business_account") {
    return res.status(200).json({ received: true, ignored: true });
  }

  const messages = extractTextMessages(event);
  const results = [];
  for (const message of messages) {
    try {
      const reply = await generateReply(message.text);
      await sendWhatsAppText({
        to: message.from,
        text: reply,
        phoneNumberId: message.phoneNumberId
      });
      results.push({ messageId: message.id, sent: true });
    } catch (error) {
      // Avoid logging message contents, tokens, or provider response bodies.
      console.error("WhatsApp auto-reply failed:", error.code || error.name || "UNKNOWN");
      results.push({ messageId: message.id, sent: false });
    }
  }

  return res.status(200).json({ received: true, processed: results.length, results });
};
