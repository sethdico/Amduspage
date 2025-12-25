const axios = require("axios");

module.exports.config = {
  name: "uid",
  author: "Sethdico",
  version: "2.0-Enhanced",
  category: "Utility",
  description: "Get your PSID and profile info",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async ({ event, api }) => {
  const senderID = event.sender.id;
  
  // ✅ FIXED: Pulled from Environment
  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

  api.sendTypingIndicator(true, senderID);
  try {
    const url = `https://graph.facebook.com/${senderID}?fields=first_name,last_name,profile_pic&access_token=${PAGE_ACCESS_TOKEN}`;
    const response = await axios.get(url, { timeout: 5000 });
    const profile = response.data;
    const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();

    const msg = `🆔 **USER INFORMATION**\n━━━━━━━━━━━━━━━━\n👤 **Name:** ${fullName || "Unknown"}\n🆔 **PSID:** ${senderID}\n━━━━━━━━━━━━━━━━\n💡 Use this ID for admin permissions or ban management.`;
    if (profile.profile_pic) {
      await api.sendAttachment("image", profile.profile_pic, senderID);
    }
    await api.sendMessage(msg, senderID);
  } catch (error) {
    console.error("[uid.js] Error fetching profile:", error.message);
    const msg = `🆔 **YOUR PSID:** ${senderID}\n⚠️ Could not fetch profile details.`;
    await api.sendMessage(msg, senderID);
  } finally {
    api.sendTypingIndicator(false, senderID);
  }
};
