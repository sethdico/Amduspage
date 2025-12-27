const { http } = require("../../utils");

module.exports.config = {
  name: "gemini",
  author: "Sethdico",
  version: "4.2",
  category: "AI",
  description: "Google Gemini with Vision.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async ({ event, args, api, reply }) => {
  const senderID = event.sender.id;
  let prompt = args.join(" ").trim();
  let imageUrl = "";

  if (event.message?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.attachments[0].payload.url;
  } else if (event.message?.reply_to?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.reply_to.attachments[0].payload.url;
  }

  if (!prompt && imageUrl) prompt = "Describe this image.";
  if (!prompt) return reply("🤖 Usage: gemini <question>");

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    const res = await http.get("https://norch-project.gleeze.com/api/gemini", {
      params: { prompt, imageurl: imageUrl }
    });

    const result = res.data.response || res.data.content || res.data.result || res.data.message;

    if (!result) throw new Error("Empty Response");

    api.sendMessage(`🤖 **GEMINI**\n━━━━━━━━━━━━━━━━\n${result}`, senderID);
  } catch (e) {
    reply("❌ Gemini is overloaded.");
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
