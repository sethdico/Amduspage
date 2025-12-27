const { http } = require("../../utils");
const history = new Map();

module.exports.config = {
  name: "copilot",
  author: "Sethdico",
  version: "4.8",
  category: "AI",
  description: "Microsoft Copilot AI.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async ({ event, args, api, reply }) => {
  const senderID = event.sender.id;
  const input = args.join(" ").trim();

  if (!input) return reply("💠 Usage: copilot <text>");
  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    let userHistory = history.get(senderID) || [];
    const context = userHistory.slice(-3).map(h => `Human: ${h.user}\nBot: ${h.bot}`).join("\n");
    const prompt = context ? `${context}\nHuman: ${input}` : input;

    const res = await http.get("https://shin-apis.onrender.com/ai/copilot", {
        params: { message: prompt }
    });

    const result = res.data.content || res.data.response || res.data.result || res.data.message;

    if (!result) throw new Error("Empty Response");

    userHistory.push({ user: input, bot: result });
    if (userHistory.length > 5) userHistory.shift();
    history.set(senderID, userHistory);

    api.sendMessage(`💠 **COPILOT**\n━━━━━━━━━━━━━━━━\n${result}`, senderID);
  } catch (e) {
    reply("❌ Copilot is unreachable.");
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
