const { http, fetchWithRetry, parseAI } = require("../../utils");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");

const CONFIG = {
  API_URL: "https://app.chipp.ai/api/v1/chat/completions",
  MODEL_ID: "newapplication-10035084", 
  TIMEOUT: 120000
};

const rateLimitStore = new Map();

async function sendYouTubeThumbnail(youtubeUrl, senderID, api) {
  try {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = youtubeUrl.match(regExp);
    if (match && match[2].length === 11) {
      const thumbnailUrl = `https://img.youtube.com/vi/${match[2]}/maxresdefault.jpg`;
      await api.sendAttachment("image", thumbnailUrl, senderID);
    }
  } catch (e) {}
}

module.exports.config = {
  name: "ai", 
  author: "Sethdico", 
  version: "17.00", 
  category: "AI", 
  description: "Advanced Assistant.", 
  adminOnly: false, 
  usePrefix: false, 
  cooldown: 0, 
};

module.exports.run = async function ({ event, args, api, reply }) {
  const senderID = event.sender.id;
  const userPrompt = args.join(" ").trim();
  const apiKey = process.env.CHIPP_API_KEY;

  if (!apiKey) return reply("❌ chipp_api_key missing.");

  // RAM Safety for sessions
  if (!global.sessions) global.sessions = new Map();
  if (global.sessions.size > 100) global.sessions.delete(global.sessions.keys().next().value);

  // 1. IMAGE DETECTION (Current message or Reply)
  let imageUrl = "";
  if (event.message?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.attachments[0].payload.url;
  } else if (event.message?.reply_to?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.reply_to.attachments[0].payload.url;
  }

  // Flow Handling
  if (imageUrl && !userPrompt && !event.message?.reply_to) {
    return reply("🖼️ I see the image. Reply to it and type your instructions.");
  }
  if (!userPrompt && !imageUrl) return reply("👋 hi. i'm amdusbot. ask me anything.");

  if (userPrompt.toLowerCase() === "clear") { 
      global.sessions.delete(senderID); 
      return reply("🧹 cleared memory."); 
  }

  // YouTube Feature
  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  if (userPrompt && youtubeRegex.test(userPrompt)) await sendYouTubeThumbnail(userPrompt, senderID, api);

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    let sessionData = global.sessions.get(senderID) || { chatSessionId: null };

    const response = await fetchWithRetry(async () => {
        // THE FIX: Raw Input only. 
        // We put the URL first to ensure the Chipp Vision model scans it.
        const rawInput = imageUrl ? `${imageUrl}\n\n${userPrompt}` : userPrompt;

        return http.post(CONFIG.API_URL, {
          model: CONFIG.MODEL_ID,
          messages: [{ role: "user", content: rawInput }],
          chatSessionId: sessionData.chatSessionId,
          stream: false
        }, {
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          timeout: CONFIG.TIMEOUT
        });
    });

    if (response.data.chatSessionId) global.sessions.set(senderID, { chatSessionId: response.data.chatSessionId });
    const replyContent = parseAI(response);

    // 2. FILE GENERATION LOGIC
    const fileRegex = /(https?:\/\/[^\s)]+\.(?:pdf|docx|xlsx|txt|jpg|jpeg|png|mp4|mp3|zip)(?:\?[^\s)]*)?)/i;
    const match = replyContent?.match(fileRegex);

    if (match) {
      const fileUrl = match[0].replace(/[).,]+$/, ""); 
      const textPart = replyContent.replace(match[0], "").trim();
      if (textPart) await reply(textPart);

      const fileName = `file_${Date.now()}${path.extname(fileUrl.split('?')[0]) || '.bin'}`;
      const filePath = path.join(global.CACHE_PATH, fileName);

      const writer = fs.createWriteStream(filePath);
      const fileRes = await http.get(fileUrl, { responseType: 'stream' });
      fileRes.data.pipe(writer);

      await new Promise((resolve) => writer.on('finish', resolve));
      await api.sendAttachment(fileName.match(/\.(jpg|png|jpeg)$/i) ? "image" : "file", filePath, senderID);
      setTimeout(async () => { try { await fsPromises.unlink(filePath); } catch(e) {} }, 10000);
    } else {
      await reply(replyContent || "❌ API offline.");
    }
  } catch (error) {
    console.error("AI Error:", error.message);
    reply("❌ AI glitch.");
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
