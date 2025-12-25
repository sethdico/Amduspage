let helpCache = null;
const feedbackShown = new Map(); // stores timestamps per user

module.exports.config = {
  name: "help",
  author: "Sethdico",
  version: "12.5",
  category: "Utility",
  description: "view commands. feedback shows every 23h.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 2,
};

module.exports.run = async ({ event, args, api, reply }) => {
  const input = args[0]?.toLowerCase();
  const senderID = event.sender.id;
  const now = Date.now();

  // 1. specific command info
  if (input && input !== "admin") {
    const cmdName = global.client.commands.has(input) ? input : global.client.aliases.get(input);
    if (cmdName) {
      const cmd = global.client.commands.get(cmdName).config;
      return reply(`🤖 **${cmd.name}**\n───────────────\ninfo: ${cmd.description}\nusage: ${cmd.name}`);
    }
  }

  // 2. main menu cache
  if (!helpCache) {
    const categories = {};
    for (const [name, cmd] of global.client.commands) {
      const cat = cmd.config.category || "General";
      if (cat.toLowerCase() === "admin") continue;
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(name);
    }
    let menu = `🤖 **menu**\n───────────────\n`;
    Object.keys(categories).sort().forEach(cat => {
      menu += `📁 **${cat.toUpperCase()}**\n[ ${categories[cat].sort().join(", ")} ]\n\n`;
    });
    menu += `───────────────\n💡 help [command] for info.`;
    helpCache = menu;
  }

  // 3. admin view
  if (input === "admin") {
    if (!global.ADMINS.has(senderID)) return reply("⛔ admin only.");
    return reply(`🔐 **admin**\n[ stats, ban, unban, broadcast ]`);
  }

  // 4. send menu
  await reply(helpCache);
  
  // 5. lowkey feedback logic
  const lastTime = feedbackShown.get(senderID) || 0;
  const oneDay = 24 * 60 * 60 * 1000; // 24 hour cooldown

  if (now - lastTime > oneDay) {
    feedbackShown.set(senderID, now);
    setTimeout(() => {
      api.sendFeedback(senderID);
    }, 3000);
  }
};
