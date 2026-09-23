// ============================================
// Crunch-it Cafeteria — WhatsApp Bot Server
// ============================================
require("dotenv").config();

const express = require("express");
const twilio = require("twilio");
const { handleMessage } = require("./chatbot");

const app = express();

// Twilio sends webhook payloads as application/x-www-form-urlencoded.
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Simple health-check route so you can confirm the server is up by
// visiting the URL directly in a browser (or via ngrok's URL).
app.get("/", (req, res) => {
  res.send("✅ Crunch-it Cafeteria WhatsApp Bot is running.");
});

// Twilio calls this URL every time a customer sends a WhatsApp message.
app.post("/webhook", async (req, res) => {
  const from = req.body.From; // e.g. "whatsapp:+919876543210"
  const body = req.body.Body || "";

  console.log(`📩 Incoming from ${from}: ${body}`);

  let replyText;
  try {
    replyText = await handleMessage(from, body);
  } catch (err) {
    console.error("Error handling message:", err);
    replyText = "⚠️ Something went wrong on our end. Please type *Hi* to start over.";
  }

  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(replyText);

  res.type("text/xml").send(twiml.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🍽️  Crunch-it Cafeteria bot server running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}`);
  console.log(`   Webhook path: http://localhost:${PORT}/webhook`);
});
