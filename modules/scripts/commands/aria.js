const axios = require("axios");
const fs = require("fs");
const path = require("path");

const SESSION_FILE = path.join(__dirname, "aria_sessions.json");
let sessions = {};
try { if (fs.existsSync(SESSION_FILE)) sessions = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8")); } catch (e) { sessions = {}; }

function save() { fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2)); }

module.exports.config = {
  name: "aria",
  author: "Sethdico",
  version: "4.0-Standalone",
  category: "AI",
  description: "Aria AI.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async ({ event, args, api }) => {
  const query = args.join(" ").trim();
  const senderID = event.sender.id;

  if (query.toLowerCase() === "clear") {
    delete sessions[senderID];
    save();
    return api.sendMessage("🧹 Aria conversation cleared!", senderID);
  }

  if (!query) return api.sendMessage("🤖 Usage: aria <question>", senderID);

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    const res = await axios.get("https://betadash-api-swordslush-production.up.railway.app/Aria", {
      params: { ask: query, userid: senderID },
      timeout: 60000
    });

    const answer = res.data.response || res.data.result || res.data.content || "❌ No response.";
    
    const msg = `🤖 **Aria AI**\n───────────────\n${answer}\n───────────────`;
    await api.sendMessage(msg, senderID);

    // Memory Logic
    if (!sessions[senderID]) sessions[senderID] = [];
    sessions[senderID].push({ role: "user", content: query }, { role: "assistant", content: answer });
    save();

  } catch (e) {
    api.sendMessage("❌ Aria is currently unavailable.", senderID);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
