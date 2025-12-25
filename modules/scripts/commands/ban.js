const fs = require("fs");
const path = require("path");
const bannedPath = path.join(__dirname, "banned.json");

module.exports.config = {
  name: "admin",
  aliases: ["ban", "unban"],
  author: "Sethdico",
  version: "2.1",
  category: "Admin",
  description: "manage users. admin only.",
  adminOnly: true,
  usePrefix: false,
  cooldown: 0,
};

module.exports.run = async function ({ event, args, api }) {
  const senderID = event.sender.id;
  const cmd = event.message.text.toLowerCase().split(" ")[0];

  if (!global.ADMINS.has(senderID)) return api.sendMessage("❌ restricted.", senderID);

  if (cmd === "ban") {
    const target = args[0];
    if (!target) return api.sendMessage("⚠️ usage: ban <id>", senderID);
    if (global.ADMINS.has(target)) return api.sendMessage("❌ can't ban an admin.", senderID);

    global.BANNED_USERS.add(target);
    saveBannedList();
    api.sendMessage(`🚫 banned ${target}`, senderID);

  } else if (cmd === "unban") {
    const target = args[0];
    if (global.BANNED_USERS.has(target)) {
      global.BANNED_USERS.delete(target);
      saveBannedList();
      api.sendMessage(`✅ unbanned ${target}`, senderID);
    }
  } else if (args[0] === "list") {
    api.sendMessage(`🚫 **banned:**\n${Array.from(global.BANNED_USERS).join("\n") || "none"}`, senderID);
  }
};

function saveBannedList() {
    fs.writeFile(bannedPath, JSON.stringify(Array.from(global.BANNED_USERS), null, 2), () => {});
}
