# WhatsApp AI Webhook

A Vercel Node.js webhook for Meta WhatsApp Cloud API with Gemini-powered text replies.

## Endpoints

- GET `/api/webhook`: verifies Meta's webhook challenge.
- POST `/api/webhook`: validates Meta's `X-Hub-Signature-256`, processes incoming text messages, generates a Gemini reply, and sends it through WhatsApp Cloud API.
- Non-text messages and delivery/status events are acknowledged but not auto-replied to.

## Environment variables

Configure these in Vercel Project → Settings → Environment Variables (Production and Preview as appropriate):

- `WHATSAPP_VERIFY_TOKEN`: random verification phrase; must match Meta's webhook configuration.
- `META_APP_SECRET`: Meta App Secret, used to validate webhook signatures.
- `WHATSAPP_ACCESS_TOKEN`: WhatsApp Cloud API access token.
- `WHATSAPP_PHONE_NUMBER_ID`: sender phone-number ID from Meta API Setup.
- `GEMINI_API_KEY`: Google AI Studio API key.
- `GEMINI_MODEL` (optional): defaults to `gemini-2.5-flash`.
- `WHATSAPP_API_VERSION` (optional): defaults to `v23.0`; set to a currently supported Graph API version for your Meta app.

Never commit secrets or share them in chat.

## Behavior and limitations

- Supports incoming text messages and replies in the same language where possible, including Tamil and English.
- Uses short request timeouts and returns an acknowledgement after processing.
- This starter does not persist message IDs, so it does not provide durable duplicate-event protection. Add a database-backed idempotency store before relying on it for production.
- Processing happens within the webhook request. Serverless execution limits may cause timeouts; test with your Vercel plan and use a durable queue for production workloads.
- There is no conversation memory, CRM, human inbox, or handover control in this first version.
- WhatsApp customer-service window and template rules still apply. API, hosting, and AI usage may incur charges.

## Testing

1. Configure all required environment variables in Vercel.
2. Set the Meta webhook URL to `https://YOUR-VERCEL-DOMAIN/api/webhook`.
3. Use the exact `WHATSAPP_VERIFY_TOKEN` value in Meta and subscribe to the `messages` field.
4. Send a test text message from an allowed recipient and inspect Vercel function logs. Never log tokens or message contents.
5. Do not merge or deploy until the pull request has been reviewed and approved.
