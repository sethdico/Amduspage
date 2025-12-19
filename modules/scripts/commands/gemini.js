const axios = require("axios");

module.exports.config = {
  name: "gemini",
  author: "Sethdico (Ported)",
  version: "1.0",
  category: "AI",
  description: "Google Gemini Vision AI",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event, args }) {
  const senderID = event.sender.id;
  const prompt = args.join(" ");
  
  // Check for attachments (Pagebot structure)
  let imageUrl = "";
  if (event.message && event.message.attachments && event.message.attachments.length > 0) {
      const attach = event.message.attachments[0];
      if (attach.type === "image" || attach.type === "photo") {
          imageUrl = attach.payload ? attach.payload.url : attach.url;
      }
  }

  if (!prompt && !imageUrl) {
      return api.sendMessage("✨ Usage: gemini <question> (or send an image)", senderID);
  }

  api.sendTypingIndicator(true, senderID);

  try {
      const apiUrl = "https://norch-project.gleeze.com/api/gemini";
      const params = { prompt: prompt || "Describe this image" };
      if (imageUrl) params.imageurl = imageUrl;

      const response = await axios.get(apiUrl, { params });
      const reply = response.data.message || response.data.response || response.data.content;

      if (reply) {
          api.sendMessage(reply, senderID);
      } else {
          api.sendMessage("❌ Gemini didn't answer.", senderID);
      }
  } catch (error) {
      api.sendMessage("❌ Error connecting to Gemini.", senderID);
  } finally {
      api.sendTypingIndicator(false, senderID);
  }
};
