module.exports.config = {
  name: "help", author: "Sethdico", version: "19.0", category: "Utility", description: "Dynamic command list.", adminOnly: false, usePrefix: false, cooldown: 2,
};

module.exports.run = async ({ event, args, api, reply }) => {
  const input = args[0]?.toLowerCase();
  const isAdmin = global.ADMINS.has(event.sender.id);

  if (input) {
      const cmd = global.client.commands.get(input) || global.client.commands.get(global.client.aliases.get(input));
      if (cmd) return reply(`🤖 **${cmd.config.name.toUpperCase()}**\n━━━━━━━━━━━━━━━━\nInfo: ${cmd.config.description}`);
  }

  const structure = { "AI": [], "FUN": [], "UTILITY": [], "ADMIN": [] };
  
  for (const [name, cmd] of global.client.commands) {
      const cat = cmd.config.category?.toUpperCase();
      if (structure[cat]) {
          if (cat === "ADMIN" && !isAdmin) continue; // Hide admin tools from users
          structure[cat].push(name);
      }
  }

  let fullMsg = `🤖 **COMMANDS**\n━━━━━━━━━━━━━━━━\n`;
  for (const cat in structure) {
      if (structure[cat].length > 0) {
          fullMsg += `📁 ${cat}: ${structure[cat].sort().join(", ")}\n\n`;
      }
  }
  
  fullMsg += `Type a category or 'help <cmd>' for info.`;
  return reply(fullMsg);
};
