const fs = require("fs");
const path = require("path");
const bannedPath = path.join(__dirname, "banned.json");

module.exports.config = {
  name: "admin",
  aliases: ["ban", "unban"],
  author: "Sethdico",
  version: "2.1",
  category: "Admin",
  description: "manage users.",
  adminOnly: true,
  usePrefix: false,
  cooldown: 0,
};

module.exports.run = async function ({ event, args, reply }) {
  const senderID = event.sender.id;
  const cmd = event.message.text.toLowerCase().split(" ")[0]; // get the first word

  if (!global.ADMINS.has(senderID)) return reply("❌ restricted.");

  if (cmd === "ban") {
    const target = args[0];
    if (!target) return reply("⚠️ usage: ban <id>");
    if (global.ADMINS.has(target)) return reply("❌ can't ban an admin.");

    global.BANNED_USERS.add(target);
    fs.writeFileSync(bannedPath, JSON.stringify(Array.from(global.BANNED_USERS), null, 2));
    reply(`🚫 banned ${target}`);

  } else if (cmd === "unban") {
    const target = args[0];
    if (global.BANNED_USERS.has(target)) {
      global.BANNED_USERS.delete(target);
      fs.writeFileSync(bannedPath, JSON.stringify(Array.from(global.BANNED_USERS), null, 2));
      reply(`✅ unbanned ${target}`);
    }
  } else if (args[0] === "list") {
    reply(`🚫 **banned:**\n${Array.from(global.BANNED_USERS).join("\n") || "none"}`);
  }
};
