const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "help",
  author: "Sethdico (Ported)",
  version: "3.0",
  category: "Utility",
  description: "List all commands.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = function ({ event, args }) {
  const commandsPath = __dirname;
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

  // ====================================================
  // 1. SPECIFIC COMMAND HELP (e.g. "help ai")
  // ====================================================
  if (args[0]) {
    const cmdName = args[0].toLowerCase();
    let foundCmd = null;

    for (const file of commandFiles) {
      try {
        const cmd = require(path.join(commandsPath, file));
        if (cmd.config && (cmd.config.name === cmdName || (cmd.config.aliases && cmd.config.aliases.includes(cmdName)))) {
          foundCmd = cmd.config;
          break;
        }
      } catch (e) { continue; }
    }

    if (foundCmd) {
      const info = `📖 **COMMAND: ${foundCmd.name.toUpperCase()}**
━━━━━━━━━━━━━━━━
📝 **Desc:** ${foundCmd.description}
📂 **Category:** ${foundCmd.category}
⌨️ **Usage:** ${foundCmd.name} ${foundCmd.usage ? foundCmd.usage : ""}
⏱️ **Cooldown:** ${foundCmd.cooldown}s
━━━━━━━━━━━━━━━━`;
      return api.sendMessage(info, event.sender.id);
    } else {
      return api.sendMessage(`❌ Command "${cmdName}" not found.`, event.sender.id);
    }
  }

  // ====================================================
  // 2. DYNAMIC LIST (Shows ALL files found)
  // ====================================================
  
  const categories = {};
  let totalCommands = 0;

  for (const file of commandFiles) {
    try {
      const cmd = require(path.join(commandsPath, file));
      if (cmd.config && cmd.config.name) {
        const cat = cmd.config.category || "Uncategorized";
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(cmd.config.name);
        totalCommands++;
      }
    } catch (e) {
      console.error(`Error loading ${file}:`, e);
    }
  }

  // Emoji Map for Categories
  const icons = {
    "AI": "🧠",
    "Utility": "🛠️",
    "Fun": "🎮",
    "Admin": "🔒",
    "Uncategorized": "📂"
  };

  let msg = `🤖 **Pagebot Commands (${totalCommands})**\n━━━━━━━━━━━━━━━━\n`;

  // Sort categories alphabetically and print
  Object.keys(categories).sort().forEach(cat => {
    const icon = icons[cat] || "📂"; // Use folder icon if category name doesn't match list
    msg += `${icon} **${cat}**\n   ${categories[cat].join(", ")}\n\n`;
  });

  msg += `━━━━━━━━━━━━━━━━\n💡 Type "help <command>" for details.\nExample: help ai`;

  api.sendMessage(msg, event.sender.id);
};
