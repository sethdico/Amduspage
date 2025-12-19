const axios = require("axios");

module.exports.config = {
  name: "copilot",
  author: "Sethdico (Ported)",
  version: "1.0",
  category: "AI",
  description: "Microsoft Copilot",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event, args }) {
  const prompt = args.join(" ");
  if (!prompt) return api.sendMessage("🟦 Usage: copilot <question>", event.sender.id);

  api.sendTypingIndicator(true, event.sender.id);

  try {
      // Using the Shin API from the source
      const response = await axios.get("https://shin-apis.onrender.com/ai/copilot", {
          params: { message: prompt, model: "precise" }
      });

      const reply = response.data.result || response.data.response || response.data.message;
      if (reply) {
          api.sendMessage(reply, event.sender.id);
      } else {
          api.sendMessage("❌ Copilot returned empty.", event.sender.id);
      }
  } catch (error) {
      api.sendMessage("❌ Copilot is currently offline.", event.sender.id);
  } finally {
      api.sendTypingIndicator(false, event.sender.id);
  }
};
