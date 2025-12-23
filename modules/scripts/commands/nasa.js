const axios = require("axios");

// === IN-MEMORY CACHE ===
let apodCache = { data: null, timestamp: 0 };
const CACHE_DURATION = 4 * 60 * 60 * 1000; // Cache for 4 hours (safe update window)

module.exports.config = {
  name: "nasa",
  author: "Sethdico (Optimized)",
  version: "3.0-Cached",
  category: "Fun",
  description: "NASA APOD with 24h caching for speed.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 2,
};

module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender.id;
  const isRandom = args[0]?.toLowerCase() === "random";
  const dateQuery = args[0] && /^\d{4}-\d{2}-\d{2}$/.test(args[0]) ? args[0] : null;

  // Fire-and-forget typing indicator
  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID).catch(() => {});

  try {
    let data;

    // 1. CHECK CACHE (If asking for today's picture)
    const now = Date.now();
    if (!isRandom && !dateQuery && apodCache.data && (now - apodCache.timestamp < CACHE_DURATION)) {
      console.log("🚀 Serving NASA APOD from Cache");
      data = apodCache.data;
    } else {
      // 2. FETCH FROM API
      const apiKey = "DEMO_KEY"; // Or your specific key
      let url = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}`;
      
      if (isRandom) url += "&count=1";
      if (dateQuery) url += `&date=${dateQuery}`;

      const res = await axios.get(url, { timeout: 10000 });
      data = Array.isArray(res.data) ? res.data[0] : res.data;

      // Update Cache if it's the standard daily request
      if (!isRandom && !dateQuery) {
        apodCache = { data, timestamp: now };
      }
    }

    // 3. FORMAT MESSAGE
    const title = data.title || "Space Image";
    const date = data.date || "Unknown Date";
    const copyright = data.copyright ? `\n📸 © ${data.copyright}` : "";
    const description = data.explanation 
      ? (data.explanation.length > 300 ? data.explanation.substring(0, 300) + "..." : data.explanation)
      : "No description.";

    const msg = `🌌 **${title.toUpperCase()}**\n━━━━━━━━━━━━━━━━\n📅 ${date}${copyright}\n\n${description}`;

    // 4. SEND (Handle Video vs Image)
    if (data.media_type === "video") {
      await api.sendMessage(`${msg}\n\n🎥 **Watch:** ${data.url}`, senderID);
    } else {
      await api.sendAttachment("image", data.hdurl || data.url, senderID);
      await api.sendMessage(msg, senderID); // Send text separately to ensure image loads first/cleaner
    }

  } catch (error) {
    console.error("NASA Error:", error.message);
    api.sendMessage("❌ Failed to contact NASA. Try 'nasa random'.", senderID);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID).catch(() => {});
  }
};
