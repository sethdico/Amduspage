const { http } = require("../utils");

module.exports.config = {
  name: "venice",
  author: "sethdico",
  version: "1.0",
  category: "AI",
  description: "Get answers from Venice AI",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
  const query = args.join(" ");
  const uid = event.sender.id;

  if (!query) return reply("Please provide a question for Venice AI.");

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, uid);

  try {
    const res = await http.get("https://shin-apis.onrender.com/ai/venice", {
      params: { 
        question: query,
        systemPrompt: "a helpful precise AI" 
      },
      timeout: 60000
    });

    const answer = res.data.answer;

    if (answer) {
      api.sendMessage(`🎭 **VENICE AI**\n────────────────\n${answer}`, uid);
    } else {
      reply("I couldn't get a response from Venice AI.");
    }

  } catch (e) {
    console.error("Venice AI Error:", e.message);
    reply("❌ The Venice AI service is currently unavailable.");
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
  }
};
