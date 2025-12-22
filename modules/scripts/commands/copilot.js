const axios = require("axios");
const fs = require("fs");
const path = require("path");

const SESSION_FILE = path.join(__dirname, "copilot_sessions.json");
let sessions = {};
try { if (fs.existsSync(SESSION_FILE)) sessions = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8")); } catch (e) { sessions = {}; }

function save() { fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2)); }

module.exports.config = {
  name: "copilot",
  author: "Sethdico",
  version: "4.0-Standalone",
  category: "AI",
  description: "Microsoft Copilot with standalone modes and vision.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender.id;

  if (args[0]?.toLowerCase() === "clear") {
    delete sessions[senderID];
    save();
    return api.sendMessage("🧹 Copilot memory cleared!", senderID);
  }

  const validModels = ["default", "think-deeper", "gpt-5"];
  let model = "default";
  let message = args.join(" ");

  if (validModels.includes(args[0]?.toLowerCase())) {
    model = args[0].toLowerCase();
    message = args.slice(1).join(" ");
  }

  if (!message) return api.sendMessage("⚠️ Usage: copilot [model] <message>\nModels: default, think-deeper, gpt-5", senderID);

  let imageUrl = "";
  if (event.message?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.attachments[0].payload.url;
  }

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    const res = await axios.get("https://shin-apis.onrender.com/ai/copilot", {
      params: { message, model, imageurl: imageUrl },
      timeout: 90000
    });

    const reply = res.data.response || res.data.answer || "❌ No response.";
    const msg = `💡 **Copilot [${model.toUpperCase()}]**\n───────────────\n${reply}`;
    
    await api.sendMessage(msg, senderID);

    if (!sessions[senderID]) sessions[senderID] = [];
    sessions[senderID].push({ role: "user", content: message });
    save();

  } catch (e) {
    api.sendMessage("❌ Copilot error. Try again later.", senderID);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
