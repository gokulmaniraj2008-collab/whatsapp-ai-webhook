const crypto = require("node:crypto");

// Vercel must leave the request body as raw bytes so Meta's signature can be checked.
module.exports.config = {
  api: {
    bodyParser: false,
  },
};

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
  if (!appSecret) {
    return res.status(503).json({ error: "Webhook is not configured: META_APP_SECRET is missing" });
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch {
    return res.status(400).json({ error: "Could not read request body" });
  }

  const signature = req.headers["x-hub-signature-256"];
  const expectedSignature =
    "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");

  if (
    typeof signature !== "string" ||
    !safeEqualText(signature, expectedSignature)
  ) {
    return res.status(401).json({ error: "Invalid webhook signature" });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "Invalid JSON payload" });
  }

  // Acknowledge valid events. Message handling and replies will be added in the next stage.
  if (event && event.object === "whatsapp_business_account") {
    console.log("Verified WhatsApp webhook event received.");
  }

  return res.status(200).json({ received: true });
};
