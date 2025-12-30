module.exports.config = {
  name: "help", author: "Sethdico", version: "14.0", category: "Utility", description: "Lite-compatible menu.", adminOnly: false, usePrefix: false, cooldown: 2,
};

module.exports.run = async ({ event, args, api, reply }) => {
  const input = args.join(" ").toLowerCase();
  if (input) {
    const cmd = global.client.commands.get(input) || global.client.commands.get(global.client.aliases.get(input));
    if (cmd) return reply(`🤖 **${cmd.config.name.toUpperCase()}**\n${cmd.config.description}`);
  }

  const msg = `🤖 **COMMANDS**\nTap a category:`;
  const buttons = [
    { type: "postback", title: "AI", payload: "AI" },
    { type: "postback", title: "FUN", payload: "FUN" },
    { type: "postback", title: "UTILITY", payload: "UTILITY" }
  ];

  // sendButton is what Lite handles best
  return api.sendButton(msg, buttons, event.sender.id);
};
