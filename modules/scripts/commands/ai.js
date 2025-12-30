const { http, fetchWithRetry, parseAI } = require("../../utils");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");

const CONFIG = {
  API_URL: "https://app.chipp.ai/api/v1/chat/completions",
  MODEL_ID: "newapplication-10035084", 
  TIMEOUT: 120000, 
  RATE_LIMIT: { requests: 5, windowMs: 60000 }
};

const sessions = new Map();
const rateLimitStore = new Map();

// FEATURE: YouTube Thumbnail Detection
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
  version: "17.05",
  category: "AI",
  description: "Advanced AI.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 0, 
};

module.exports.run = async function ({ event, args, api, reply }) {
  const senderID = event.sender.id;
  const userPrompt = args.join(" ").trim();
  const apiKey = process.env.CHIPP_API_KEY;

  if (!apiKey) return reply("❌ chipp_api_key missing on render.");
  
  // 1. Rate Limiting
  const now = Date.now();
  const userTs = rateLimitStore.get(senderID) || [];
  const recentTs = userTs.filter(ts => now - ts < CONFIG.RATE_LIMIT.windowMs);
  if (recentTs.length >= CONFIG.RATE_LIMIT.requests) return reply("⏳ Slow down.");
  recentTs.push(now);
  rateLimitStore.set(senderID, recentTs);

  // 2. RAM Safety
  if (!global.sessions) global.sessions = new Map();
  if (global.sessions.size > 100) global.sessions.delete(global.sessions.keys().next().value);

  // 3. IMAGE DETECTION (Direct URL from Current or Reply)
  let imageUrl = "";
  const currentImg = event.message?.attachments?.find(a => a.type === "image");
  const repliedImg = event.message?.reply_to?.attachments?.find(a => a.type === "image");

  if (currentImg) {
      imageUrl = currentImg.payload.url;
  } else if (repliedImg) {
      imageUrl = repliedImg.payload.url;
  }

  // Initial instruction if user sends only an image
  if (imageUrl && !userPrompt && !event.message?.reply_to) {
    return reply("🖼️ I see the image. Reply to it and type your instructions.");
  }
  if (!userPrompt && !imageUrl) return reply("👋 hi. i'm amdusbot. how can i help?");

  if (userPrompt.toLowerCase() === "clear") { 
      global.sessions.delete(senderID); 
      return reply("🧹 memory cleared."); 
  }

  // 4. YouTube Feature
  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  if (userPrompt && youtubeRegex.test(userPrompt)) await sendYouTubeThumbnail(userPrompt, senderID, api);

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    let sessionData = global.sessions.get(senderID) || { chatSessionId: null };

    const response = await fetchWithRetry(async () => {
        // THE RAW FIX: No code-based prompts. Just the URL and your Text.
        const finalInput = imageUrl ? `${imageUrl}\n\n${userPrompt || "Describe this image"}` : userPrompt;

        return http.post(CONFIG.API_URL, {
          model: CONFIG.MODEL_ID,
          messages: [{ role: "user", content: finalInput }],
          chatSessionId: sessionData.chatSessionId,
          stream: false
        }, {
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          timeout: CONFIG.TIMEOUT
        });
    });

    if (response.data.chatSessionId) global.sessions.set(senderID, { chatSessionId: response.data.chatSessionId });

    const replyContent = parseAI(response);
    if (!replyContent) return reply("❌ AI glitch.");

    // 5. FILE/LINK DETECTION
    const fileRegex = /(https?:\/\/[^\s)]+\.(?:pdf|docx|xlsx|txt|jpg|jpeg|png|mp4|mp3|zip)(?:\?[^\s)]*)?)/i;
    const match = replyContent.match(fileRegex);

    if (match) {
      const fileUrl = match[0].replace(/[).,]+$/, ""); 
      const textPart = replyContent.replace(match[0], "").trim();
      if (textPart) await reply(textPart);

      const fileName = `file_${Date.now()}${path.extname(fileUrl.split('?')[0]) || '.bin'}`;
      const filePath = path.join(global.CACHE_PATH, fileName);

      const writer = fs.createWriteStream(filePath);
      const fileRes = await http.get(fileUrl, { responseType: 'stream' });
      fileRes.data.pipe(writer);

      await new Promise((res) => writer.on('finish', res));
      await api.sendAttachment(fileName.match(/\.(jpg|png|jpeg)$/i) ? "image" : "file", filePath, senderID);
      setTimeout(async () => { try { await fsPromises.unlink(filePath); } catch(e) {} }, 10000);
    } else {
      await reply(replyContent);
    }
  } catch (error) { 
      console.error("AI Error:", error.message);
      reply("❌ AI glitch."); 
  } finally {
      if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
