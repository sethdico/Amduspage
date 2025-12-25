const { http } = require("../../utils");

// Simple memory storage
const ariaHistory = new Map();

module.exports.config = {
  name: "aria",
  author: "Sethdico",
  version: "5.1-Fast",
  category: "AI",
  description: "Aria AI that remembers what you said.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender.id;
  const input = args.join(" ").trim();

  // Reset command
  if (input.toLowerCase() === "clear" || input.toLowerCase() === "reset") {
    ariaHistory.delete(senderID);
    return api.sendMessage("🧹 Aria's memory wiped.", senderID);
  }

  if (!input) return api.sendMessage("🤖 Usage: aria <message>", senderID);

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID).catch(()=>{});

  try {
    // Get past messages
    let history = ariaHistory.get(senderID) || [];
    
    // Format last 3 messages for context
    const contextString = history
        .slice(-3) 
        .map(entry => `User: ${entry.user}\nAria: ${entry.bot}`)
        .join("\n");

    const finalPrompt = contextString 
        ? `[Previous]:\n${contextString}\n\n[Current]:\n${input}`
        : input;

    // Fast Request
    const res = await http.get("https://betadash-api-swordslush-production.up.railway.app/Aria", {
      params: { 
          ask: finalPrompt, 
          userid: senderID 
      }
    });

    const answer = res.data.response || res.data.result || res.data.content;

    if (!answer) throw new Error("Empty API response");

    // Save to memory
    history.push({ user: input, bot: answer });
    if (history.length > 6) history.shift(); // Keep it light
    ariaHistory.set(senderID, history);

    const msg = `🤖 **Aria**\n━━━━━━━━━━━━━━━━\n${answer}`;
    await api.sendMessage(msg, senderID);

  } catch (e) {
    api.sendMessage("❌ Aria is napping right now.", senderID);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID).catch(()=>{});
  }
};
