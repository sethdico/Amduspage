const fs = require("fs");
const path = require("path");
const config = require("../config.json");
const { getTheme } = require("../website/web.js");
const cooldowns = {}; 

module.exports = async function (event) {
  const modulesPath = path.join(__dirname, "../modules/scripts/commands");
  const commandFiles = fs.readdirSync(modulesPath).filter(file => file.endsWith(".js"));
  
  // 1. HANDLE "GET STARTED" BUTTON
  if (event.postback && event.postback.payload === "GET_STARTED_PAYLOAD") {
      return api.sendMessage(
          "👋 **Welcome!**\nI am Pagebot. You can chat with me naturally or use commands.\n\nType `help` to see what I can do!", 
          event.sender.id
      );
  }

  // 2. BASIC CHECKS
  if (event.message?.is_echo) return;
  if (config.markAsSeen) api.markAsSeen(true, event.sender.id).catch(()=>{});

  const messageText = event.message?.text || "";
  if (!messageText && !event.message?.attachments) return;

  const [rawCmd, ...args] = messageText.split(" ");
  let commandFound = false;

  // 3. CHECK FOR COMMANDS
  for (const file of commandFiles) {
    const command = require(path.join(modulesPath, file));
    let cmdName = rawCmd.toLowerCase();
    
    // Prefix Logic
    if (command.config.usePrefix) {
        if (!cmdName.startsWith(config.PREFIX)) continue;
        cmdName = cmdName.slice(config.PREFIX.length);
    }

    if (cmdName === command.config.name.toLowerCase() || (command.config.aliases && command.config.aliases.includes(cmdName))) {
        commandFound = true;
        
        // Admin Check
        if (command.config.adminOnly && !config.ADMINS.includes(event.sender.id)) {
            return api.sendMessage("🔒 Admin only.", event.sender.id);
        }

        // Cooldown Check
        const now = Date.now();
        const timestamps = cooldowns[command.config.name] || new Map();
        const cooldownAmount = (command.config.cooldown || 3) * 1000;

        if (timestamps.has(event.sender.id)) {
            const expirationTime = timestamps.get(event.sender.id) + cooldownAmount;
            if (now < expirationTime) {
                return; // Silently ignore if on cooldown
            }
        }

        timestamps.set(event.sender.id, now);
        cooldowns[command.config.name] = timestamps;

        try {
            console.log(getTheme().gradient(`SYSTEM:`), `${command.config.name} executed!`);
            await command.run({ event, args });
        } catch (e) { 
            console.error(e); 
            api.sendMessage("❌ Error executing command.", event.sender.id);
        }
        break; // Stop loop if command found
    }
  }

  // 4. SMART FALLBACK (AUTO-AI)
  // If no command was found, and it wasn't a prefix attempt, talk to AI
  if (!commandFound && !messageText.startsWith(config.PREFIX)) {
      try {
          // Load the AI command manually
          const aiCommand = require(path.join(modulesPath, "ai.js"));
          // Pass the whole text as args
          const aiArgs = messageText.split(" "); 
          await aiCommand.run({ event, args: aiArgs });
      } catch (e) {
          // Fail silently if AI breaks, so we don't spam
          console.error("Auto-AI Failed:", e.message);
      }
  }
};
