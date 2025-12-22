const axios = require("axios");
const aiUtils = require("./ai-utils");
module.exports.config = {
  name: "gemini",
  author: "Sethdico",
  version: "2.0",
  category: "AI",
  description: "Google Gemini Vision with conversation memory and image analysis.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};
module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender.id;
  let prompt = args.join(" ");
let imageUrl = "";

  if (prompt.toLowerCase() === "clear") {
    aiUtils.clearSession(senderID, "gemini");
    return api.sendMessage("🧹 Gemini conversation cleared!", senderID);
}

  if (event.message?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.attachments[0].payload?.url || event.message.attachments[0].url;
} else if (event.message?.reply_to?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.reply_to.attachments[0].payload?.url || event.message.reply_to.attachments[0].url;
}

  if (!prompt && imageUrl) prompt = "Describe this image in detail, including objects, colors, mood, and composition.";
if (!prompt && !imageUrl)
    return api.sendMessage(
      "⚠️ **Usage:**\ngemini <question> - Ask anything\ngemini [image] <prompt> - Image analysis\ngemini clear - Reset conversation",
      senderID,
    );
api.sendTypingIndicator(true, senderID);

  try {
    const session = aiUtils.getOrCreateSession(senderID, "gemini");
    const userMessage = imageUrl ?
`[IMAGE] ${prompt}` : prompt;
    session.messages.push({ role: "user", content: userMessage });

    const apiUrl = "https://norch-project.gleeze.com/api/gemini";
const requestParams = { prompt: prompt };
    if (imageUrl) requestParams.imageurl = imageUrl;
const response = await axios.get(apiUrl, {
      params: requestParams,
      timeout: 60000,
    });
const reply = response.data.message || response.data.response || response.data.result;

    if (reply) {
      session.messages.push({ role: "assistant", content: reply });
aiUtils.updateSession(senderID, "gemini", session);

      await aiUtils.formatAIResponse(reply, senderID, api, imageUrl ? "👁️ Gemini Vision" : "🤖 Gemini");
} else {
      api.sendMessage("❌ Gemini returned empty response.", senderID);
}
  } catch (e) {
    console.error("Gemini Error:", e.message);
    await aiUtils.handleAPIError(e, senderID, api, "Gemini");
} finally {
    api.sendTypingIndicator(false, senderID);
  }
};
