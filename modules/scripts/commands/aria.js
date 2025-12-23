const axios = require("axios");

// === MEMORY STORAGE ===
// Map<SenderID, Array<{user: string, bot: string}>>
const ariaHistory = new Map();

module.exports.config = {
  name: "aria",
  author: "Sethdico (Memory-Fixed)",
  version: "5.1-Contextual",
  category: "AI",
  description: "Aria AI that actually remembers context.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender.id;
  const input = args.join(" ").trim();

  // 1. CLEAR MEMORY COMMAND
  if (input.toLowerCase() === "clear" || input.toLowerCase() === "reset") {
    ariaHistory.delete(senderID);
    return api.sendMessage("🧹 Aria's memory of you has been wiped.", senderID);
  }

  if (!input) return api.sendMessage("🤖 Usage: aria <message>", senderID);

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID).catch(()=>{});

  try {
    // 2. BUILD CONTEXT STRING
    let history = ariaHistory.get(senderID) || [];
    
    // Convert array of objects into a conversation string
    // Limit to last 3 exchanges to prevent "URL Too Long" errors on GET requests
    const contextString = history
        .slice(-3) 
        .map(entry => `User: ${entry.user}\nAria: ${entry.bot}`)
        .join("\n");

    // 3. CONSTRUCT FINAL PROMPT
    // We tell Aria to look at the previous messages
    const finalPrompt = contextString 
        ? `[Previous Conversation]:\n${contextString}\n\n[Current Message]:\n${input}`
        : input;

    // 4. API CALL
    const res = await axios.get("https://betadash-api-swordslush-production.up.railway.app/Aria", {
      params: { 
          ask: finalPrompt, 
          userid: senderID 
      },
      timeout: 40000
    });

    const answer = res.data.response || res.data.result || res.data.content;

    if (!answer) throw new Error("Empty API response");

    // 5. SAVE TO MEMORY
    history.push({ user: input, bot: answer });
    
    // Keep history small (max 6 items) to save RAM
    if (history.length > 6) history.shift();
    ariaHistory.set(senderID, history);

    // 6. SEND RESPONSE
    const msg = `🤖 **Aria**\n━━━━━━━━━━━━━━━━\n${answer}`;
    await api.sendMessage(msg, senderID);

  } catch (e) {
    console.error("Aria Error:", e.message);
    api.sendMessage("❌ Aria is unavailable right now.", senderID);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID).catch(()=>{});
  }
};
