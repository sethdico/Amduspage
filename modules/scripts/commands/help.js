const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "help",
  author: "Sethdico (Ported)",
  version: "2.0",
  category: "Utility",
  description: "Shows the command list or specific command usage.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = function ({ event, args }) {
  const commandsPath = __dirname;
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

  // ====================================================
  // 1. SPECIFIC COMMAND HELP (e.g., "help ai")
  // ====================================================
  if (args[0]) {
    const cmdName = args[0].toLowerCase();
    let foundCmd = null;

    for (const file of commandFiles) {
      const cmd = require(path.join(commandsPath, file));
      // Check both name and aliases (if you decide to add aliases later)
      if (cmd.config && (cmd.config.name === cmdName || (cmd.config.aliases && cmd.config.aliases.includes(cmdName)))) {
        foundCmd = cmd.config;
        break;
      }
    }

    if (foundCmd) {
      const info = `📖 **COMMAND: ${foundCmd.name.toUpperCase()}**
━━━━━━━━━━━━━━━━
📝 **Desc:** ${foundCmd.description}
📂 **Category:** ${foundCmd.category}
⌨️ **Usage:** ${foundCmd.name} ${foundCmd.usage ? foundCmd.usage : "<text>"}
⏱️ **Cooldown:** ${foundCmd.cooldown}s
━━━━━━━━━━━━━━━━`;
      return api.sendMessage(info, event.sender.id);
    } else {
      return api.sendMessage(`❌ Command "${cmdName}" not found.`, event.sender.id);
    }
  }

  // ====================================================
  // 2. GENERAL COMMAND LIST (Grouped by Category)
  // ====================================================
  
  // Define buckets for your commands
  const groups = {
    "AI": [],       // ai, aria, copilot, gemini, quillbot, venice
    "Utility": [],  // define, help, remind, translate, uid, uptime, webpilot, you
    "Fun": [],      // 48laws, bible, deepimg
    "Other": []     // Fallback
  };

  // Sort commands into buckets
  for (const file of commandFiles) {
    const cmd = require(path.join(commandsPath, file));
    if (cmd.config && cmd.config.name) {
      const cat = cmd.config.category || "Other";
      
      // Push to specific group or fallback to 'Other'
      if (groups[cat]) {
        groups[cat].push(cmd.config.name);
      } else {
        groups["Other"].push(cmd.config.name);
      }
    }
  }

  // Construct the final message
  let msg = `🤖 **Pagebot Command List**\n`;
  msg += `━━━━━━━━━━━━━━━━\n`;

  if (groups["AI"].length > 0) {
    msg += `🧠 **AI Assistants**\n${groups["AI"].join(", ")}\n\n`;
  }

  if (groups["Utility"].length > 0) {
    msg += `🛠️ **Tools & Utilities**\n${groups["Utility"].join(", ")}\n\n`;
  }

  if (groups["Fun"].length > 0) {
    msg += `🎮 **Fun & Random**\n${groups["Fun"].join(", ")}\n\n`;
  }

  if (groups["Other"].length > 0) {
    msg += `📂 **Others**\n${groups["Other"].join(", ")}\n\n`;
  }

  msg += `━━━━━━━━━━━━━━━━\n`;
  msg += `💡 Type "help <command>" for details.\n`;
  msg += `Example: help ai`;

  api.sendMessage(msg, event.sender.id);
};
