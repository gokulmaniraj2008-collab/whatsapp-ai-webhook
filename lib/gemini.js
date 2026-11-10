const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

async function generateReply(customerMessage) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw Object.assign(new Error("Gemini is not configured"), { code: "GEMINI_NOT_CONFIGURED" });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: "You are a concise, helpful WhatsApp assistant. Reply in the same language as the customer's message, including Tamil or English. Keep replies friendly and brief. Do not invent business prices, policies, availability, order status, or personal information. If the question needs a human or business-specific facts you do not know, say that a team member will follow up. Never claim an action was completed unless the system confirms it."
          }]
        },
        contents: [{ role: "user", parts: [{ text: String(customerMessage).slice(0, 4000) }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 300 }
      }),
      signal: AbortSignal.timeout(6500)
    }
  );

  if (!response.ok) {
    const error = new Error("Gemini request failed");
    error.code = `GEMINI_HTTP_${response.status}`;
    throw error;
  }
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();
  if (!text) throw Object.assign(new Error("Gemini returned no text"), { code: "GEMINI_EMPTY_REPLY" });
  return text.slice(0, 3500);
}

module.exports = { generateReply };
