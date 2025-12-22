const config = require("../config.json");

module.exports = async function (event) {
  const api = global.api; 
  if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
    return api.sendMessage("👋 Welcome to Amdusbot! Type help to see commands.", event.sender.id);
  }

  if (event.message?.is_echo) return;

  const messageText = (event.message?.text || event.postback?.payload || "").trim();
  if (!messageText && !event.message?.attachments) return;

  const args = messageText.split(" ");
  let cmdName = args.shift().toLowerCase();
  if (cmdName.startsWith(config.PREFIX)) {
    cmdName = cmdName.slice(config.PREFIX.length);
  }

  let command = global.client.commands.get(cmdName) || 
                global.client.commands.get(global.client.aliases.get(cmdName));

  if (command) {
    // Enforce Admin Security
    const adminList = config.ADMINS || config.ADMIN || [];
    if (command.config.adminOnly && !adminList.includes(event.sender.id)) {
      return api.sendMessage("⛔ Restricted: Admin access only.", event.sender.id);
    }

    try {
      await command.run({ event, args, api });
    } catch (e) {
      console.error(`Crash in ${cmdName}:`, e.message);
      api.sendMessage("❌ Command encountered an error.", event.sender.id);
    }
  } else {
    // Auto-AI for non-prefixed messages
    const aiCommand = global.client.commands.get("ai");
    if (aiCommand && !messageText.startsWith(config.PREFIX)) {
      aiCommand.run({ event, args: messageText.split(" "), api });
    }
  }
};
