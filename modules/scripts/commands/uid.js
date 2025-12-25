const axios = require("axios");

module.exports.config = {
  name: "uid",
  author: "Sethdico",
  version: "2.1",
  category: "Utility",
  description: "get psid and profile info.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async ({ event, api, reply }) => {
  const senderID = event.sender.id;

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);
  
  try {
    const url = `https://graph.facebook.com/${senderID}?fields=first_name,last_name,profile_pic&access_token=${global.PAGE_ACCESS_TOKEN}`;
    const response = await axios.get(url, { timeout: 5000 });
    const profile = response.data;
    const name = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();

    const msg = `🆔 **user info**\n━━━━━━━━━━━━━━━━\n👤 **name:** ${name || "unknown"}\n🆔 **psid:** ${senderID}\n━━━━━━━━━━━━━━━━`;
    
    if (profile.profile_pic) {
      await api.sendAttachment("image", profile.profile_pic, senderID);
    }
    reply(msg);
  } catch (e) {
    reply(`🆔 **psid:** ${senderID}`);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
