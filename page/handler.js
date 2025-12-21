const path = require("path");
const config = require("../config.json");

// --- 🛡️ GLOBAL RATE LIMITER ---
const rateLimitStore = new Map();
const RATE_LIMIT = { requests: 10, windowMs: 60000 }; 

module.exports = async function (event) {
  if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
      return api.sendMessage("👋 **Welcome to Amdusbot!**\nI'm a Multi-AI assistant. Talk to me naturally or type `help`!", event.sender.id);
  }

  if (event.message?.is_echo) return;

  const senderID = event.sender.id;

  // --- 🛡️ RATE LIMIT CHECK ---
  const now = Date.now();
  const userTs = rateLimitStore.get(senderID) || [];
  const recentTs = userTs.filter(ts => now - ts < RATE_LIMIT.windowMs);
  
  if (recentTs.length >= RATE_LIMIT.requests) {
    if (recentTs.length === RATE_LIMIT.requests) {
        api.sendMessage("⏳ You are sending messages too fast. Please slow down.", senderID);
    }
    return;
  }
  recentTs.push(now);
  rateLimitStore.set(senderID, recentTs);

  // --- 🧠 COMMAND LOGIC ---
  const messageText = (event.message?.text || event.postback?.payload || "").trim();
  if (!messageText && !event.message?.attachments) return;

  const [rawCmd, ...args] = messageText.split(" ");
  let cmdName = rawCmd.toLowerCase();

  // Handle Prefix
  if (cmdName.startsWith(config.PREFIX)) {
      cmdName = cmdName.slice(config.PREFIX.length);
  }

  // 🟢 NEW: Instant Lookup (No more looping through files!)
  let command = global.client.commands.get(cmdName);
  
  // Check aliases if command not found
  if (!command && global.client.aliases.has(cmdName)) {
      const actualName = global.client.aliases.get(cmdName);
      command = global.client.commands.get(actualName);
  }

  if (command) {
      try {
          await command.run({ event, args });
      } catch (e) { 
          console.error(`Crash in ${cmdName}:`, e.message); 
          api.sendMessage("❌ Command error. Please try again.", senderID);
      }
  } else {
      // 🔄 Auto-AI Fallback
      // If no command matched, run AI
      if (!messageText.startsWith(config.PREFIX) && (messageText || event.message?.attachments)) {
          try {
              // We grab AI directly from memory now
              const aiCommand = global.client.commands.get("ai"); 
              if (aiCommand) await aiCommand.run({ event, args: messageText.split(" ") });
          } catch (e) {
              console.error("Auto-AI Error:", e.message);
          }
      }
  }
};
