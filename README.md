# Crunch-it Cafeteria — WhatsApp Chatbot

A WhatsApp ordering bot for Crunch-it Cafeteria, built with Node.js, Express,
and Twilio's WhatsApp API. Customers browse the menu, build a cart, confirm
an order, and leave a star rating — all inside WhatsApp. The cafeteria owner
gets notified by email and WhatsApp the moment an order comes in.

Conversation flow: **Welcome → Browse Categories → Pick Items → Quantity →
Confirm → Feedback**

---

## 1. Prerequisites

Install these before you start:

- **Node.js** v18 or newer — [nodejs.org](https://nodejs.org) (check with `node -v`)
- **A Twilio account** — free at [twilio.com](https://www.twilio.com). The
  WhatsApp Sandbox is free for testing (no credit card charges).
- **A Gmail account** — for sending order notification emails (or swap in
  any other SMTP provider in `notifications.js`).
- **ngrok** — free at [ngrok.com](https://ngrok.com), used to expose your
  local server to Twilio during development.

---

## 2. Install dependencies

```bash
cd crunch-it-bot
npm install
```

This installs `express`, `twilio`, `nodemailer`, and `dotenv` as listed in
`package.json`.

---

## 3. Set up Twilio WhatsApp Sandbox

1. Sign up / log in at [twilio.com](https://www.twilio.com)
2. In the Console, go to **Messaging → Try it out → Send a WhatsApp message**
3. You'll see a sandbox number (usually `+1 415 523 8886`) and a join code
   like `join happy-elephant`
4. From your own phone's WhatsApp, send that join code as a message to that
   number — this links your phone to the sandbox for testing
5. Copy your **Account SID** and **Auth Token** from the top of the Twilio
   Console dashboard — you'll need both in step 5

Anyone who wants to test the bot (including the cafeteria owner, for
WhatsApp order notifications) needs to join the sandbox the same way.

---

## 4. Set up Gmail app password

1. Go to your Google Account → **Security** → turn on **2-Step Verification**
   (required before app passwords work)
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Create an app password (choose "Mail") — copy the 16-character code shown

---

## 5. Configure environment variables

Copy the example file:

```bash
cp .env.example .env
```

Open `.env` and fill in real values:

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_real_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

EMAIL_USER=youremail@gmail.com
EMAIL_PASS=your16charapppassword
NOTIFICATION_EMAIL=cafeteria_owner@gmail.com

OWNER_WHATSAPP=+91XXXXXXXXXX
PORT=3000
```

**Never commit the real `.env` file to GitHub** — only `.env.example` should
be public. If you're using git, add `.env` to a `.gitignore` file.

The bot still runs fine with these left blank/placeholder — it just skips
sending notifications and logs a warning instead of crashing.

---

## 6. Start the server

```bash
npm start
```

You should see:
```
🍽️  Crunch-it Cafeteria bot server running on port 3000
   Health check: http://localhost:3000
   Webhook path: http://localhost:3000/webhook
```

Leave this terminal running. Visit `http://localhost:3000` in a browser to
confirm you see the health-check message.

(Optional: use `npm run dev` instead — it auto-restarts the server whenever
you save a file, using Node's built-in `--watch` flag.)

---

## 7. Expose it with ngrok

Open a **second terminal window** and run:

```bash
ngrok http 3000
```

It prints something like:
```
Forwarding   https://a1b2-c3d4.ngrok-free.app -> http://localhost:3000
```

Copy the `https://...ngrok-free.app` URL.

---

## 8. Connect the webhook in Twilio

1. Twilio Console → **Messaging → Try it out → Send a WhatsApp message**
2. Find **"When a message comes in"**
3. Paste: `https://a1b2-c3d4.ngrok-free.app/webhook`
4. Method: **HTTP POST**
5. Save

---

## 9. Test it

From the WhatsApp number that joined the sandbox (step 3), message the
sandbox number:

```
Hi
```

Walk through the full flow — pick a category, pick an item, enter a
quantity, say yes to add more or place the order, confirm with **YES**, then
rate 1–5. Watch your first terminal for logs; check your email and the
owner's WhatsApp for the order notification.

### Try these too
- Reply `0` while browsing items to go back to categories
- Reply `NO` or `CANCEL` at the confirmation step to cancel an order
- Reply `MODIFY` at the confirmation step to add more items without losing your cart
- Send a random word at any point — the bot reprompts instead of breaking

---

## 10. Going to production

The Sandbox is for testing only — it expires after a few days of inactivity
and requires everyone to manually "join." For a real, permanent WhatsApp
number:

1. In Twilio Console, apply for **WhatsApp Business API** access (requires
   a Meta Business verification)
2. Once approved, replace `TWILIO_WHATSAPP_NUMBER` with your approved number
3. Deploy `server.js` somewhere permanent (Render, Railway, Fly.io, a VPS,
   etc.) instead of your laptop + ngrok, and point the Twilio webhook at
   that permanent URL
4. Consider swapping the in-memory `sessions` Map in `chatbot.js` for Redis
   or a database if you expect the server to restart often or run on
   multiple instances

---

## Troubleshooting

| Problem | Likely cause |
|---|---|
| No reply on WhatsApp | ngrok URL not saved in Twilio webhook, server not running, or `/webhook` missing from the URL |
| `ngrok: command not found` | Restart your terminal after installing, or it's not in your PATH |
| No email received | Wrong app password, or 2-Step Verification not enabled on Gmail |
| No owner WhatsApp notification | Owner's number hasn't joined the sandbox, or `OWNER_WHATSAPP` isn't in `+countrycode...` format |
| ngrok URL stopped working | Free ngrok URLs change every time you restart ngrok — update the Twilio webhook again |
| `Cannot find module 'twilio'` | Run `npm install` again from inside the `crunch-it-bot` folder |
| Bot forgets where you were | Server restarted — sessions are in-memory and reset with the process |

---

## ⚠️ Before going live

The menu prices in `menu.js` are placeholders inherited from the original
spec. **Review every price against your real menu before customers can
place real orders.**

---

## Project Structure

```
crunch-it-bot/
├── package.json       → dependencies & npm scripts
├── .env.example        → environment variable template (copy to .env)
├── server.js           → Express server + Twilio webhook endpoint
├── menu.js              → menu data + formatting helpers
├── chatbot.js           → conversation state machine
├── notifications.js     → email (Nodemailer) & WhatsApp (Twilio) order alerts
└── README.md            → this file
```
