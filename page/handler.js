const fs = require("fs");
const path = require("path");
const config = require("../config.json");

module.exports = async function (event) {
  const modulesPath = path.join(__dirname, "../modules/scripts/commands");
  const commandFiles = fs.readdirSync(modulesPath).filter(file => file.endsWith(".js"));
  
  if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
      return api.sendMessage("👋 **Welcome to Amdusbot!**\nTalk to me naturally or type `help`!", event.sender.id);
  }

  if (event.message?.is_echo) return;

  // --- 🛠️ THE FIX: Read typed text OR button payload ---
  const messageText = (event.message?.text || event.postback?.payload || "").trim();
  if (!messageText && !event.message?.attachments) return;

  const [rawCmd, ...args] = messageText.split(" ");
  let cmdName = rawCmd.toLowerCase();
  let commandFound = false;

  // Aliases
  if (cmdName === "draw" || cmdName === "generate") cmdName = "deepimg";

  for (const file of commandFiles) {
    const command = require(path.join(modulesPath, file));
    let checkName = cmdName;
    if (command.config.usePrefix && checkName.startsWith(config.PREFIX)) {
        checkName = checkName.slice(config.PREFIX.length);
    }

    if (checkName === command.config.name.toLowerCase()) {
        commandFound = true;
        try {
            await command.run({ event, args });
        } catch (e) { 
            console.error(`Crash in ${cmdName}:`, e.message); 
        }
        break;
    }
  }

  // Auto-AI Fallback
  if (!commandFound && !messageText.startsWith(config.PREFIX) && messageText.length > 0) {
      try {
          const aiCommand = require(path.join(modulesPath, "ai.js"));
          await aiCommand.run({ event, args: messageText.split(" ") });
      } catch (e) {}
  }
};
