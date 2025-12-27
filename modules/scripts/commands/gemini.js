const { http } = require("../../utils");

module.exports.config = {
  name: "gemini",
  author: "Sethdico",
  version: "4.3",
  category: "AI",
  description: "Google Gemini with Vision.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
  let input = args.join(" ");
  let imageUrl = event.message?.attachments?.[0]?.payload?.url || event.message?.reply_to?.attachments?.[0]?.payload?.url || "";
  
  if (!input && !imageUrl) return reply("🤖 Usage: gemini <text>");

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id);

  try {
    const res = await http.get("https://norch-project.gleeze.com/api/gemini", {
      params: { prompt: input, imageurl: imageUrl }
    });
    const result = res.data.response || res.data.content || res.data.result;
    api.sendMessage(`🤖 **GEMINI**\n━━━━━━━━━━━━━━━━\n${result || "Empty response."}`, event.sender.id);
  } catch (e) {
    reply("❌ Gemini is overloaded.");
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, event.sender.id);
  }
};
