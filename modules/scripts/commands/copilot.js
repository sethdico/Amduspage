const axios = require("axios");

// === MEMORY STORAGE ===
const copilotHistory = new Map();

module.exports.config = {
  name: "copilot",
  author: "Sethdico (Memory-Fixed)",
  version: "4.6-Contextual",
  category: "AI",
  description: "Microsoft Copilot with local memory injection.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender.id;

  // 1. HANDLE MODEL & INPUT
  const validModels = ["precise", "creative", "balanced"];
  let model = "balanced"; 
  let input = args.join(" ");

  // Check if first word is a model name
  if (validModels.includes(args[0]?.toLowerCase())) {
    model = args[0].toLowerCase();
    input = args.slice(1).join(" ");
  }

  // 2. CLEAR MEMORY
  if (input.toLowerCase() === "clear" || args[0]?.toLowerCase() === "clear") {
    copilotHistory.delete(senderID);
    return api.sendMessage("🧹 Copilot context cleared.", senderID);
  }

  if (!input) return api.sendMessage("💠 Usage: copilot <text>\nOr: copilot creative <text>", senderID);

  // 3. IMAGE DETECTION
  let imageUrl = "";
  if (event.message?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.attachments[0].payload.url;
  } else if (event.message?.reply_to?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.reply_to.attachments[0].payload.url;
  }

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID).catch(()=>{});

  try {
    // 4. PREPARE MEMORY STITCHING
    let history = copilotHistory.get(senderID) || [];
    
    // Format history: "User: Hi \n Copilot: Hello"
    const contextString = history
        .slice(-3) // Last 3 turns
        .map(h => `Human: ${h.user}\nCopilot: ${h.bot}`)
        .join("\n");

    let finalPrompt = input;
    
    // Only inject history if no image (Images usually reset context in these APIs)
    if (contextString && !imageUrl) {
        finalPrompt = `Context:\n${contextString}\n\nHuman: ${input}`;
    }

    // 5. API REQUEST
    const res = await axios.get("https://shin-apis.onrender.com/ai/copilot", {
      params: { 
          q: finalPrompt, 
          model: model, 
          url: imageUrl 
      },
      timeout: 60000
    });

    const reply = res.data.response || res.data.answer || res.data.result;
    
    if (!reply) throw new Error("No response");

    // 6. SAVE MEMORY
    history.push({ user: input, bot: reply });
    if (history.length > 6) history.shift();
    copilotHistory.set(senderID, history);

    // 7. SEND
    const header = `💠 **Copilot [${model.toUpperCase()}]**`;
    await api.sendMessage(`${header}\n━━━━━━━━━━━━━━━━\n${reply}`, senderID);

  } catch (e) {
    console.error("Copilot Error:", e.message);
    api.sendMessage("❌ Copilot is unreachable.", senderID);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID).catch(()=>{});
  }
};
