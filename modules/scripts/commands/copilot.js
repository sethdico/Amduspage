const axios = require("axios");

// === MEMORY STORAGE ===
const copilotHistory = new Map();

module.exports.config = {
  name: "copilot",
  author: "Sethdico (Fixed)",
  version: "4.7-Fixed",
  category: "AI",
  description: "Microsoft Copilot with updated API parameters.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender.id;

  // 1. HANDLE INPUT
  // Removing the model selection logic as many of these third-party APIs 
  // currently only accept the 'message' parameter.
  const input = args.join(" ").trim();

  // 2. CLEAR MEMORY
  if (input.toLowerCase() === "clear" || args[0]?.toLowerCase() === "clear") {
    copilotHistory.delete(senderID);
    return api.sendMessage("🧹 Copilot context cleared.", senderID);
  }

  if (!input) return api.sendMessage("💠 Usage: copilot <your question>", senderID);

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID).catch(()=>{});

  try {
    // 3. PREPARE MEMORY STITCHING
    let history = copilotHistory.get(senderID) || [];
    
    const contextString = history
        .slice(-3) 
        .map(h => `Human: ${h.user}\nCopilot: ${h.bot}`)
        .join("\n");

    let finalPrompt = input;
    if (contextString) {
        finalPrompt = `Context:\n${contextString}\n\nHuman: ${input}`;
    }

    // 4. API REQUEST (Fixed Parameter: message)
    // Removed 'model' and 'url' as the error indicates only 'message' is expected/required
    const res = await axios.get("https://shin-apis.onrender.com/ai/copilot", {
      params: { 
          message: finalPrompt 
      },
      timeout: 60000
    });

    const reply = res.data.content || res.data.response || res.data.answer;
    
    if (!reply) {
        // Log error if API returned something else
        console.error("Copilot API unexpected response:", res.data);
        throw new Error("No response content found");
    }

    // 5. SAVE MEMORY
    history.push({ user: input, bot: reply });
    if (history.length > 6) history.shift();
    copilotHistory.set(senderID, history);

    // 6. SEND
    const header = `💠 **Copilot**`;
    await api.sendMessage(`${header}\n━━━━━━━━━━━━━━━━\n${reply}`, senderID);

  } catch (e) {
    console.error("Copilot Error:", e.response?.data || e.message);
    
    // Check if the API sent a specific error message
    const apiError = e.response?.data?.error || "Copilot is unreachable right now.";
    api.sendMessage(`❌ ${apiError}`, senderID);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID).catch(()=>{});
  }
};
