// ============================================
// Crunch-it Cafeteria — Chatbot State Machine
// ============================================
const {
  getCategories,
  getItemById,
  formatCategoryList,
  formatMenuCategory,
} = require("./menu");
const { sendOrderEmail, sendOrderWhatsApp } = require("./notifications");

const STATE = {
  WELCOME: "WELCOME",
  CATEGORY: "CATEGORY_SELECTION",
  ITEM: "ITEM_SELECTION",
  QUANTITY: "QUANTITY",
  ADD_MORE: "ADD_MORE",
  CONFIRM: "CONFIRM_ORDER",
  FEEDBACK: "FEEDBACK",
};

// In-memory session store, keyed by phone number (Twilio's "From" field,
// e.g. "whatsapp:+919876543210"). Resets whenever the server restarts —
// fine for a small cafeteria bot, but swap for Redis/a DB if you need
// sessions to survive restarts or scale across multiple server instances.
const sessions = new Map();

function getSession(from) {
  if (!sessions.has(from)) {
    sessions.set(from, {
      state: STATE.WELCOME,
      cart: [],
      selectedCategory: null,
      orderId: null,
    });
  }
  return sessions.get(from);
}

function resetSession(from) {
  sessions.set(from, {
    state: STATE.WELCOME,
    cart: [],
    selectedCategory: null,
    orderId: null,
  });
}

function generateOrderId() {
  return `CRN-${Date.now().toString().slice(-4)}`;
}

function cartTotal(cart) {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function formatOrderSummary(cart) {
  const lines = cart.map(
    (item) => `${item.quantity}x ${item.name} — ₹${item.price * item.quantity}`
  );
  return (
    `📝 *Your Order Summary:*\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    lines.join("\n") +
    `\n━━━━━━━━━━━━━━━━━\n` +
    `💰 *Total: ₹${cartTotal(cart)}*\n\n` +
    `Confirm order? Reply *YES* to confirm, *NO*/*CANCEL* to cancel, or *MODIFY* to add more items.`
  );
}

function welcomeMessage() {
  return (
    `🍽️ Welcome to *Crunch-it Cafeteria*!\n` +
    `We're glad to have you here! 😊\n\n` +
    formatCategoryList()
  );
}

/**
 * Processes a single incoming WhatsApp message and returns the bot's
 * text reply. Session state is tracked per phone number in `from`.
 * @param {string} from - the sender's WhatsApp address (e.g. "whatsapp:+91...")
 * @param {string} body - the raw message text
 * @returns {Promise<string>} the reply to send back
 */
async function handleMessage(from, body) {
  const input = (body || "").trim();
  const lower = input.toLowerCase();
  const session = getSession(from);

  // Global reset trigger — works from any state.
  if (["hi", "hello", "hey", "start", "menu"].includes(lower)) {
    resetSession(from);
    const s = getSession(from);
    s.state = STATE.CATEGORY;
    return welcomeMessage();
  }

  switch (session.state) {
    // ── WELCOME (very first message from a brand-new session) ──
    case STATE.WELCOME: {
      session.state = STATE.CATEGORY;
      return welcomeMessage();
    }

    // ── CATEGORY SELECTION ───────────────
    case STATE.CATEGORY: {
      const categoryId = parseInt(input, 10);
      const categories = getCategories();
      const match = categories.find((c) => c.id === categoryId);

      if (!match) {
        return (
          `⚠️ Please reply with a valid category number.\n\n` + formatCategoryList()
        );
      }

      session.selectedCategory = categoryId;
      session.state = STATE.ITEM;
      return formatMenuCategory(categoryId);
    }

    // ── ITEM SELECTION ───────────────────
    case STATE.ITEM: {
      if (input === "0" || lower === "back") {
        session.state = STATE.CATEGORY;
        return formatCategoryList();
      }

      const itemId = parseInt(input, 10);
      const item = getItemById(session.selectedCategory, itemId);

      if (!item) {
        return (
          `⚠️ That's not a valid item number. Please try again.\n\n` +
          formatMenuCategory(session.selectedCategory)
        );
      }

      session.pendingItem = item;
      session.state = STATE.QUANTITY;
      return `You selected *${item.name}* (₹${item.price})\nHow many would you like?`;
    }

    // ── QUANTITY ──────────────────────────
    case STATE.QUANTITY: {
      const qty = parseInt(input, 10);
      if (isNaN(qty) || qty <= 0 || qty > 20) {
        return `⚠️ Please enter a valid quantity (1-20):`;
      }

      const item = session.pendingItem;
      const existing = session.cart.find((c) => c.name === item.name);
      if (existing) {
        existing.quantity += qty;
      } else {
        session.cart.push({ name: item.name, price: item.price, quantity: qty });
      }
      session.pendingItem = null;
      session.state = STATE.ADD_MORE;

      const subtotal = item.price * qty;
      return (
        `✅ Added *${qty}x ${item.name}* (₹${subtotal}) to your cart!\n\n` +
        `Would you like to add more items?\n` +
        `1️⃣ Yes, browse menu\n` +
        `2️⃣ No, place order`
      );
    }

    // ── ADD MORE? ─────────────────────────
    case STATE.ADD_MORE: {
      if (input === "1") {
        session.state = STATE.CATEGORY;
        return formatCategoryList();
      }
      if (input === "2") {
        if (session.cart.length === 0) {
          session.state = STATE.CATEGORY;
          return `Your cart is empty! Let's pick something first.\n\n` + formatCategoryList();
        }
        session.state = STATE.CONFIRM;
        return formatOrderSummary(session.cart);
      }
      return `⚠️ Please reply *1* to browse more, or *2* to place your order.`;
    }

    // ── CONFIRM ORDER ─────────────────────
    case STATE.CONFIRM: {
      if (lower === "yes") {
        const orderId = generateOrderId();
        session.orderId = orderId;

        const orderData = {
          orderId,
          customerPhone: from.replace("whatsapp:", ""),
          items: session.cart,
          total: cartTotal(session.cart),
          timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        };

        // Fire notifications, but never let a notification failure break
        // the customer-facing conversation.
        try {
          await sendOrderEmail(orderData);
        } catch (err) {
          console.error("Email notification failed:", err.message);
        }
        try {
          await sendOrderWhatsApp(orderData);
        } catch (err) {
          console.error("WhatsApp notification failed:", err.message);
        }

        session.state = STATE.FEEDBACK;
        return (
          `🎉 *Order Confirmed!*\n` +
          `📋 Order ID: #${orderId}\n` +
          `⏰ Estimated time: 15-20 mins\n\n` +
          `We'd love your feedback!\n` +
          `Rate us from ⭐ 1 to 5:`
        );
      }

      if (lower === "modify") {
        session.state = STATE.CATEGORY;
        return formatCategoryList();
      }

      if (lower === "no" || lower === "cancel") {
        resetSession(from);
        return `❌ Order cancelled.\nType *Hi* to start a new order! 👋`;
      }

      return `⚠️ Please reply *YES* to confirm, *NO*/*CANCEL* to cancel, or *MODIFY* to add more items.`;
    }

    // ── FEEDBACK ──────────────────────────
    case STATE.FEEDBACK: {
      const rating = parseInt(input, 10);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        return `⚠️ Please rate us from ⭐ *1* to *5*:`;
      }

      const stars = "⭐".repeat(rating);
      const orderId = session.orderId;
      resetSession(from);

      let ratingMsg;
      if (rating >= 4) {
        ratingMsg = `${stars}\n\n🌟 *Thank you for the amazing rating!*`;
      } else if (rating === 3) {
        ratingMsg = `${stars}\n\n🙏 *Thanks for the feedback!* We'll do better!`;
      } else {
        ratingMsg = `${stars}\n\n😔 *We're sorry!* We'll work hard to improve.`;
      }

      return (
        ratingMsg +
        `\n\n` +
        `Your order *#${orderId}* is being prepared at *Crunch-it*! 🍽️\n` +
        `See you again soon! 👋\n\n` +
        `Type *Hi* anytime to place a new order.`
      );
    }

    // ── DEFAULT / FALLBACK ────────────────
    default: {
      resetSession(from);
      return `🍽️ *Welcome to Crunch-it Cafeteria!*\nType *Hi* to start ordering! 😊`;
    }
  }
}

module.exports = { handleMessage, resetSession, STATE };
