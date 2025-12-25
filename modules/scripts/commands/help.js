let helpCache = null;

module.exports.config = {
  name: "help",
  author: "Sethdico",
  version: "12.5-Fast",
  category: "Utility",
  description: "Show commands.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 2,
};

module.exports.run = async ({ event, args, reply }) => {
  const input = args[0]?.toLowerCase();

  // 1. Specific command help
  if (input) {
    const cmd = global.client.commands.get(input) || global.client.commands.get(global.client.aliases.get(input));
    if (cmd) {
        return reply(`🤖 **${cmd.config.name}**\ninfo: ${cmd.config.description}`);
    }
  }

  // 2. Build Cache if missing
  if (!helpCache) {
    const cats = {};
    for (const [name, cmd] of global.client.commands) {
      const c = cmd.config.category || "General";
      if (c === "Admin") continue; 
      if (!cats[c]) cats[c] = [];
      cats[c].push(name);
    }
    
    let menu = `🤖 **COMMANDS**\n━━━━━━━━━━━━━━━━\n`;
    Object.keys(cats).sort().forEach(c => {
      menu += `📁 ${c.toUpperCase()}: ${cats[c].join(", ")}\n\n`;
    });
    menu += `Type 'help <cmd>' for details.`;
    helpCache = menu;
  }

  await reply(helpCache);
};
