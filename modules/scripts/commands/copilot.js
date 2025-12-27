const { http } = require("../../utils");

module.exports.config = {
  name: "copilot",
  author: "Sethdico",
  version: "5.5",
  category: "AI",
  description: "Copilot AI (default, think, gpt5)",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
  let model = "default";
  let message = args.join(" ");

  // Model Selector Logic
  if (args[0]?.toLowerCase() === "think") {
      model = "think-deeper";
      message = args.slice(1).join(" ");
  } else if (args[0]?.toLowerCase() === "gpt5") {
      model = "gpt-5";
      message = args.slice(1).join(" ");
  }

  if (!message) {
      return reply("💠 **Copilot Usage:**\n1. copilot <text>\n2. copilot think <text>\n3. copilot gpt5 <text>");
  }

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id);

  try {
    const res = await http.get("https://shin-apis.onrender.com/ai/copilot", {
        params: { 
            message: message, 
            model: model 
        } 
    });
    
    // Using the 'answer' key confirmed by your playground test
    const result = res.data.answer || res.data.content || res.data.response || res.data.result;
    
    const modelName = model === "default" ? "DEFAULT" : (model === "gpt-5" ? "GPT-5" : "DEEP THINK");
    api.sendMessage(`💠 **COPILOT (${modelName})**\n━━━━━━━━━━━━━━━━\n${result}`, event.sender.id);

  } catch (e) {
    reply("❌ Copilot is unreachable.");
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, event.sender.id);
  }
};
