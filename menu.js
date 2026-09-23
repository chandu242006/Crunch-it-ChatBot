// ============================================
// Crunch-it Cafeteria — Menu Data
// ============================================
// NOTE: Prices below are placeholders. Double-check every price
// against your real menu before going live with customers.

const menu = {
  1: {
    name: "Today's Special 🔥",
    items: {
      1: { name: "Chicken Curry", price: 120 },
      2: { name: "Chicken Kabab", price: 130 },
      3: { name: "Chicken Fry", price: 110 },
      4: { name: "Chicken Fried Rice", price: 100 },
      5: { name: "Chicken Curry Rice", price: 110 },
    },
  },
  2: {
    name: "Breads 🍞",
    items: {
      1: { name: "Porota", price: 20 },
      2: { name: "Butter Nan", price: 30 },
      3: { name: "Chappathi", price: 15 },
    },
  },
  3: {
    name: "Morning Special ☀️ (7am-12pm)",
    items: {
      1: { name: "Green Kabab", price: 80 },
    },
  },
  4: {
    name: "Evening Special 🌙",
    items: {
      1: { name: "Pav Bhaji", price: 70 },
      2: { name: "Chola Batura", price: 80 },
      3: { name: "French Fries", price: 60 },
      4: { name: "Chilli Potato", price: 70 },
      5: { name: "Chilli Paratha (Veg)", price: 50 },
      6: { name: "Chilli Paratha (Non-Veg)", price: 70 },
    },
  },
  5: {
    name: "Chats 🥘",
    items: {
      1: { name: "Masala Puri", price: 50 },
      2: { name: "Pani Puri", price: 40 },
      3: { name: "Aloo Puri", price: 50 },
      4: { name: "Papdi Chat", price: 50 },
      5: { name: "Sweet Puchka", price: 40 },
    },
  },
  6: {
    name: "Rolls 🌯",
    items: {
      1: { name: "Egg Roll", price: 60 },
      2: { name: "Paneer Roll", price: 70 },
    },
  },
  7: {
    name: "Fresh Juices 🧃",
    items: {
      1: { name: "Mosambi", price: 50 },
      2: { name: "Grape", price: 60 },
      3: { name: "Musk Melon", price: 50 },
      4: { name: "Watermelon", price: 40 },
      5: { name: "Pineapple", price: 60 },
      6: { name: "Pomegranate", price: 70 },
    },
  },
  8: {
    name: "Milkshakes 🥤",
    items: {
      1: { name: "Sharjah", price: 80 },
      2: { name: "Butterscotch", price: 80 },
      3: { name: "Chocolate", price: 90 },
      4: { name: "Strawberry", price: 80 },
      5: { name: "Black Current", price: 80 },
      6: { name: "Kiwi", price: 90 },
      7: { name: "Blueberry", price: 90 },
      8: { name: "Mango", price: 80 },
      9: { name: "Custard Apple", price: 90 },
      10: { name: "Apple", price: 70 },
      11: { name: "Chikku", price: 70 },
    },
  },
};

// Small helper: converts 1-11 into a WhatsApp-friendly emoji/number label.
// Emoji digits only render nicely for single digits, so beyond 9 we fall
// back to a plain "10." style label.
const EMOJI_DIGITS = ["", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];
function numberLabel(n) {
  return EMOJI_DIGITS[n] || `${n}.`;
}

/**
 * Returns the ordered list of categories as { id, name }.
 */
function getCategories() {
  return Object.keys(menu).map((id) => ({
    id: Number(id),
    name: menu[id].name,
  }));
}

/**
 * Returns the items object for a given category id, or null if the
 * category doesn't exist.
 */
function getItemsByCategory(categoryId) {
  const category = menu[categoryId];
  return category ? category.items : null;
}

/**
 * Returns a single item ({ name, price }) for a category + item id,
 * or null if either doesn't exist.
 */
function getItemById(categoryId, itemId) {
  const items = getItemsByCategory(categoryId);
  if (!items) return null;
  return items[itemId] || null;
}

/**
 * Formats the full category list (used on the welcome screen).
 */
function formatCategoryList() {
  const categories = getCategories();
  const lines = categories.map((c) => `${numberLabel(c.id)} ${c.name}`);
  return (
    `📋 *Our Menu Categories:*\n` +
    lines.join("\n") +
    `\n\nReply with a number to browse!`
  );
}

/**
 * Formats a single category's items for WhatsApp display.
 */
function formatMenuCategory(categoryId) {
  const category = menu[categoryId];
  if (!category) return "⚠️ That category doesn't exist. Please choose again.";

  const lines = Object.keys(category.items).map((itemId) => {
    const item = category.items[itemId];
    return `${itemId}. ${item.name} — ₹${item.price}`;
  });

  return (
    `*${category.name}*\n` +
    lines.join("\n") +
    `\n\nReply with the item number to add to cart!\n(Reply *0* to go back to categories)`
  );
}

module.exports = {
  menu,
  getCategories,
  getItemsByCategory,
  getItemById,
  formatCategoryList,
  formatMenuCategory,
};
