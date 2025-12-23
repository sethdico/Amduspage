const config = require("../../../config.json");

// === CACHE FOR MENU ===
let helpCache = null;

module.exports.config = {
  name: "help",
  author: "Sethdico (Optimized)",
  version: "12.0-Cached",
  category: "Utility",
  description: "View command list.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 2,
};

module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender.id;
  const prefix = config.PREFIX || "/";
  const input = args[0]?.toLowerCase();

  // 1. HANDLE SPECIFIC COMMAND LOOKUP (O(1) Map Lookup)
  if (input && input !== "admin") {
    const cmdName = global.client.commands.has(input) ? input : global.client.aliases.get(input);
    if (cmdName) {
      const cmd = global.client.commands.get(cmdName).config;
      const msg = `🤖 **COMMAND: ${cmd.name.toUpperCase()}**\n───────────────\n📄 **Info:** ${cmd.description}\n🔧 **Usage:** ${cmd.usePrefix ? prefix : ""}${cmd.name}\n⏱️ **Cooldown:** ${cmd.cooldown}s`;
      return api.sendMessage(msg, senderID);
    }
  }

  // 2. GENERATE MENU (First Run Only)
  if (!helpCache) {
    const commands = global.client.commands;
    const categories = {};
    const adminCommands = [];

    // Sort and Group
    for (const [name, cmd] of commands) {
      if (!cmd.config) continue;
      const cat = cmd.config.category || "General";
      if (cat.toLowerCase() === "admin") {
        adminCommands.push(name);
      } else {
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(name);
      }
    }

    // Build String
    let menuMsg = `🤖 **AMDUSBOT MENU**\n───────────────\n`;
    const sortedCats = Object.keys(categories).sort();
    
    sortedCats.forEach(cat => {
      menuMsg += `📁 **${cat.toUpperCase()}**\n[ ${categories[cat].sort().join(", ")} ]\n\n`;
    });

    menuMsg += `───────────────\n💡 Type "help [command]" for details.`;
    helpCache = { text: menuMsg, adminCount: adminCommands.length };
  }

  // 3. SEND CACHED MENU
  if (input === "admin") {
    // Admin check logic here...
    const adminList = config.ADMINS || config.ADMIN || [];
    if (!adminList.includes(senderID)) return api.sendMessage("⛔ Admin only.", senderID);
    return api.sendMessage(`🔐 **ADMIN COMMANDS**\n[ Check code or use 'ban', 'unban', 'uid' ]`, senderID);
  }

  api.sendMessage(helpCache.text, senderID);
};
