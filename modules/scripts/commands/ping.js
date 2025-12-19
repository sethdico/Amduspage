module.exports.config = {
  name: "ping",
  usePrefix: true, // Use !ping
  adminOnly: false,
  cooldown: 5
};

module.exports.run = function ({ event }) {
  api.sendMessage("Pong! 🏓", event.sender.id);
};
