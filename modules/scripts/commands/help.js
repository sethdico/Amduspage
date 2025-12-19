const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "help",
  author: "Sethdico (Ported)",
  version: "1.0",
  category: "Utility",
  description: "Shows list of commands or details of a specific command",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = function ({ event, args }) {
  const commandsPath = __dirname; // Gets the current directory (commands folder)
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

  // 1. SPECIFIC COMMAND HELP (e.g. "help ai")
  if (args[0]) {
    const cmdName = args[0].toLowerCase();
    let foundCommand = null;

    // Search for the command
    for (const file of commandFiles) {
      const cmd = require(path.join(commandsPath, file));
      if (cmd.config && cmd.config.name.toLowerCase() === cmdName) {
        foundCommand = cmd.config;
        break;
      }
    }

    if (foundCommand) {
      const msg = `📖 **COMMAND: ${foundCommand.name.toUpperCase()}**
━━━━━━━━━━━━━━━━
📝 **Description:** ${foundCommand.description || "No description"}
📂 **Category:** ${foundCommand.category || "General"}
⌨️ **Usage:** ${foundCommand.name} ${foundCommand.usage ? foundCommand.usage : "<args>"}
👑 **Admin Only:** ${foundCommand.adminOnly ? "Yes" : "No"}
⏱️ **Cooldown:** ${foundCommand.cooldown || 0}s
━━━━━━━━━━━━━━━━`;
      return api.sendMessage(msg, event.sender.id);
    } else {
      return api.sendMessage(`❌ Command "${cmdName}" not found.`, event.sender.id);
    }
  }

  // 2. GENERAL HELP (List all commands)
  let msg = `🤖 **Pagebot Commands**\n━━━━━━━━━━━━━━━━\n`;
  let categories = {};

  // Sort commands into categories
  for (const file of commandFiles) {
    const cmd = require(path.join(commandsPath, file));
    if (cmd.config && cmd.config.name) {
      const cat = cmd.config.category || "Uncategorized";
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(cmd.config.name);
    }
  }

  // Build the message
  for (const [category, cmds] of Object.entries(categories)) {
    msg += `📂 **${category}**\n   ${cmds.join(", ")}\n\n`;
  }

  msg += `━━━━━━━━━━━━━━━━\n💡 Type "help <command>" for details.\nExample: help ai`;

  api.sendMessage(msg, event.sender.id);
};
