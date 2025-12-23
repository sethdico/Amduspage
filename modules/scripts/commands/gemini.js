const axios = require("axios");

module.exports.config = {
  name: "gemini",
  author: "Sethdico",
  version: "4.1-Optimized",
  category: "AI",
  description: "Google Gemini with Vision.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender.id;
  let prompt = args.join(" ").trim();
  let imageUrl = "";

  // Image Detection
  if (event.message?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.attachments[0].payload.url;
  } else if (event.message?.reply_to?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.reply_to.attachments[0].payload.url;
  }

  if (!prompt && imageUrl) prompt = "Describe this image.";
  if (!prompt) return api.sendMessage("🤖 Usage: gemini <question>", senderID);

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID).catch(()=>{});

  try {
    const res = await axios.get("https://norch-project.gleeze.com/api/gemini", {
      params: { prompt, imageurl: imageUrl },
      timeout: 20000 // 20s Timeout
    });

    const reply = res.data.response || res.data.content;
    if (!reply) throw new Error("Empty response");

    api.sendMessage(`🤖 **Gemini**\n━━━━━━━━━━━━━━━━\n${reply}`, senderID);

  } catch (e) {
    api.sendMessage("❌ Gemini is overloaded. Try 'ai <question>' instead.", senderID);
  }
};
