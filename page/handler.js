const userSpam = new Map();

module.exports = async function (event) {
  const api = global.api;
  const senderID = event.sender.id;
  const reply = (text) => api.sendMessage(text, senderID);

  // 1. anti-spam
  const now = Date.now();
  const userData = userSpam.get(senderID) || { count: 0, lastMsg: 0, locked: false };
  if (userData.locked && now < userData.locked) return;
  
  if (now - userData.lastMsg < 1000) {
    userData.count++;
    if (userData.count > 5) {
        userData.locked = now + 30000;
        userSpam.set(senderID, userData);
        return reply("⚠️ too fast. ignoring for 30s.");
    }
  } else { userData.count = 0; }
  userData.lastMsg = now;
  userSpam.set(senderID, userData);

  // 2. welcome
  if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
    const userInfo = await api.getUserInfo(senderID);
    return reply(`👋 hi ${userInfo.first_name || "user"}! help to start.`);
  }

  if (event.message?.is_echo) return;
  const messageText = (event.message?.text || event.postback?.payload || "").trim();
  if (!messageText && !event.message?.attachments) return;

  const args = messageText.split(" ");
  const cmdName = args.shift().toLowerCase();

  // 3. command logic
  let command = global.client.commands.get(cmdName) || global.client.commands.get(global.client.aliases.get(cmdName));

  if (command) {
      if (command.config.adminOnly && !global.ADMINS.has(senderID)) {
          return reply("⛔ admin only.");
      }
      try {
          await command.run({ event, args, api, reply });
      } catch (e) { 
          console.error(e);
          reply("❌ command failed.");
      }
  } else {
      // fallback to ai
      const aiCommand = global.client.commands.get("ai");
      if (aiCommand) await aiCommand.run({ event, args: messageText.split(" "), api, reply });
  }
};
