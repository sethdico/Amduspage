module.exports.config = {
  name: "help", author: "Sethdico", version: "13.0", category: "Utility", description: "Interactive menu.", adminOnly: false, usePrefix: false, cooldown: 2,
};

module.exports.run = async ({ event, args, api, reply }) => {
  const input = args[0]?.toLowerCase();
  if (input) {
    const cmd = global.client.commands.get(input) || global.client.commands.get(global.client.aliases.get(input));
    if (cmd) return reply(`🤖 **${cmd.config.name.toUpperCase()}**\n━━━━━━━━━━━━━━━━\nInfo: ${cmd.config.description}\nCategory: ${cmd.config.category}`);
  }

  const menu = `🤖 **COMMANDS**\n━━━━━━━━━━━━━━━━\nTap a category below to browse or type 'help <cmd>' for details.`;
  const categories = ["AI", "FUN", "UTILITY"];
  
  return api.sendQuickReply(menu, categories, event.sender.id);
};
