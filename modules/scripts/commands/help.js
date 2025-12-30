module.exports.config = {
  name: "help",
  author: "Sethdico",
  version: "16.0",
  category: "Utility",
  description: "Interactive command menu.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 2,
};

module.exports.run = async ({ event, args, api, reply }) => {
  const input = args[0]?.toUpperCase();
  const categories = ["AI", "FUN", "UTILITY", "ADMIN"];

  // 1. Handle "help <category>" (e.g. help ai)
  if (categories.includes(input)) {
      let list = `📁 **${input} COMMANDS:**\n━━━━━━━━━━━━━━━━\n`;
      for (const [name, cmd] of global.client.commands) {
          if (cmd.config.category?.toUpperCase() === input) {
              list += `• ${name}\n`;
          }
      }
      return reply(list);
  }

  // 2. Handle "help <command>" (e.g. help joke)
  if (args[0]) {
      const cmd = global.client.commands.get(args[0].toLowerCase()) || 
                  global.client.commands.get(global.client.aliases.get(args[0].toLowerCase()));
      if (cmd) {
          return reply(`🤖 **${cmd.config.name.toUpperCase()}**\n━━━━━━━━━━━━━━━━\nInfo: ${cmd.config.description}\nCategory: ${cmd.config.category}`);
      }
  }

  // 3. Default Interactive Menu
  const msg = `🤖 **COMMAND MENU**\n━━━━━━━━━━━━━━━━\nTap a category to browse or type help <cmd> for details.`;
  
  const buttons = [
    { type: "postback", title: "AI", payload: "AI" },
    { type: "postback", title: "FUN", payload: "FUN" },
    { type: "postback", title: "UTILITY", payload: "UTILITY" }
  ];

  try {
      await api.sendButton(msg, buttons, event.sender.id);
  } catch (e) {
      // Fallback for Lite if buttons fail to render
      reply(`${msg}\n\nCategories: AI, FUN, UTILITY`);
  }
};
