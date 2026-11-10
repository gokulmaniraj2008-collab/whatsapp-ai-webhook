# WhatsApp AI Webhook

A small Vercel Node.js webhook endpoint for the WhatsApp Cloud API.

## Current stage

- GET `/api/webhook`: verifies Meta's webhook challenge.
- POST `/api/webhook`: validates Meta's `X-Hub-Signature-256` using the app secret and acknowledges events.
- This starter does not yet send WhatsApp replies or call an AI model.

## Deploy

Import this repository into Vercel and deploy it as a Node.js project. The endpoint will be:

`https://YOUR-VERCEL-DOMAIN/api/webhook`

## Vercel environment variables

Add these under Project → Settings → Environment Variables:

- `WHATSAPP_VERIFY_TOKEN`: a long random phrase you create. Use the exact same value in Meta's webhook Verify Token field.
- `META_APP_SECRET`: the App Secret from Meta App Dashboard → App settings → Basic. Keep it private.

Redeploy after adding or changing environment variables.

## Meta webhook setup

In the Meta app, open WhatsApp → Configuration (or Webhooks), enter the endpoint URL and the same `WHATSAPP_VERIFY_TOKEN`, then verify and subscribe to the `messages` field.

Never commit access tokens, app secrets, phone numbers, or OTPs to GitHub.

## Free-tier note

Vercel Hobby is free for personal, non-commercial projects and has usage limits. Use this starter for learning/testing only; check current Vercel and Meta terms before using it for a live business. WhatsApp production messaging and AI API use may incur charges.
