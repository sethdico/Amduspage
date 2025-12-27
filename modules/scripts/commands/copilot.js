const { http, parseAI } = require("../../utils");

module.exports.config = {
  name: "copilot",
  author: "Sethdico",
  version: "6.0",
  category: "AI",
  description: "Copilot AI (default, think, gpt5)",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
  let model = "default";
  let message = args.join(" ");

  if (args[0]?.toLowerCase() === "think") {
      model = "think-deeper";
      message = args.slice(1).join(" ");
  } else if (args[0]?.toLowerCase() === "gpt5") {
      model = "gpt-5";
      message = args.slice(1).join(" ");
  }

  if (!message) return reply("💠 Usage: copilot [think/gpt5] <text>");
  if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id);

  try {
    const res = await http.get("https://shin-apis.onrender.com/ai/copilot", {
        params: { message: message, model: model } 
    });
    const result = parseAI(res);
    const modelTag = model.toUpperCase().replace("-", " ");
    api.sendMessage(`💠 **COPILOT (${modelTag})**\n━━━━━━━━━━━━━━━━\n${result || "No response."}`, event.sender.id);
  } catch (e) {
    reply("❌ Copilot unreachable.");
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, event.sender.id);
  }
};
