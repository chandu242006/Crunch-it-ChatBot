// ============================================
// Crunch-it Cafeteria — Order Notifications
// ============================================
// Sends the cafeteria owner an email and/or WhatsApp message whenever
// a customer confirms an order. Both functions no-op (with a console
// warning) if their required environment variables aren't set, so the
// bot still works for local testing before you've configured SMTP/Twilio.

const nodemailer = require("nodemailer");

// ─── Email Notification ──────────────────────
/**
 * Sends an order notification email to the cafeteria owner via Gmail SMTP.
 * @param {object} orderData - { orderId, customerPhone, items, total, timestamp }
 *   items: Array<{ name, price, quantity }>
 */
async function sendOrderEmail(orderData) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log("⚠️  Email credentials not configured. Skipping email notification.");
    return;
  }
  if (!process.env.NOTIFICATION_EMAIL) {
    console.log("⚠️  NOTIFICATION_EMAIL not set. Skipping email notification.");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const itemRows = orderData.items
    .map(
      (item) =>
        `<tr>
           <td style="padding:6px 10px;border-bottom:1px solid #eee;">${item.name}</td>
           <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
           <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">₹${item.price * item.quantity}</td>
         </tr>`
    )
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
      <h2 style="color:#c2632c;">🆕 New Order — Crunch-it Cafeteria</h2>
      <p><strong>Order ID:</strong> #${orderData.orderId}</p>
      <p><strong>Customer:</strong> ${orderData.customerPhone}</p>
      <p><strong>Time:</strong> ${orderData.timestamp}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;">
        <thead>
          <tr style="background:#f5f1e6;">
            <th style="padding:8px 10px;text-align:left;">Item</th>
            <th style="padding:8px 10px;text-align:center;">Qty</th>
            <th style="padding:8px 10px;text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <p style="font-size:1.1rem;margin-top:14px;"><strong>Total: ₹${orderData.total}</strong></p>
    </div>`;

  const textFallback =
    `New Order — Crunch-it Cafeteria\n` +
    `Order ID: #${orderData.orderId}\n` +
    `Customer: ${orderData.customerPhone}\n` +
    `Time: ${orderData.timestamp}\n\n` +
    orderData.items
      .map((i) => `${i.quantity}x ${i.name} — ₹${i.price * i.quantity}`)
      .join("\n") +
    `\n\nTotal: ₹${orderData.total}`;

  const mailOptions = {
    from: `"Crunch-it Cafeteria Bot" <${process.env.EMAIL_USER}>`,
    to: process.env.NOTIFICATION_EMAIL,
    subject: `🆕 New Order #${orderData.orderId} — ₹${orderData.total}`,
    text: textFallback,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`✅ Email notification sent: ${info.messageId}`);
}

// ─── WhatsApp Notification ───────────────────
/**
 * Sends an order notification to the owner's WhatsApp via Twilio.
 * @param {object} orderData - { orderId, customerPhone, items, total, timestamp }
 */
async function sendOrderWhatsApp(orderData) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log("⚠️  Twilio not configured. Skipping WhatsApp notification.");
    return;
  }
  if (!process.env.OWNER_WHATSAPP) {
    console.log("⚠️  Owner WhatsApp number not set. Skipping notification.");
    return;
  }

  const client = require("twilio")(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  let itemsText = "";
  orderData.items.forEach((item) => {
    const subtotal = item.price * item.quantity;
    itemsText += `  • ${item.quantity}x ${item.name} — ₹${subtotal}\n`;
  });

  const message =
    `🆕 *NEW ORDER — Crunch-it*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📋 *Order ID:* #${orderData.orderId}\n` +
    `📱 *Customer:* ${orderData.customerPhone}\n` +
    `🕐 *Time:* ${orderData.timestamp}\n\n` +
    `*Items:*\n${itemsText}\n` +
    `💰 *Total: ₹${orderData.total}*\n` +
    `━━━━━━━━━━━━━━━━━━━━`;

  const msg = await client.messages.create({
    body: message,
    from: process.env.TWILIO_WHATSAPP_NUMBER,
    to: `whatsapp:${process.env.OWNER_WHATSAPP}`,
  });
  console.log(`✅ WhatsApp notification sent: ${msg.sid}`);
}

module.exports = { sendOrderEmail, sendOrderWhatsApp };
