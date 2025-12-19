const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

// === CONFIGURATION ===
const CONFIG = {
  API_URL: "https://app.chipp.ai/api/v1/chat/completions",
  API_KEY: "live_561eee985c6d2d0523948b29c4188049697df36dd8677c7471bb74de4112cd35",
  MODEL_ID: "newapplication-10034686",
  TIMEOUT: 120000,
  SESSION_TIMEOUT: 30 * 60 * 1000,
  // Rate limit: 5 requests per 60 seconds per user
  RATE_LIMIT: { requests: 5, windowMs: 60 * 1000 }
};

const sessions = new Map();
const rateLimitStore = new Map(); // { userId: [timestamps] }

// === UTILS ===
function enforceRateLimit(senderID) {
  const now = Date.now();
  const window = CONFIG.RATE_LIMIT.windowMs;
  const maxRequests = CONFIG.RATE_LIMIT.requests;

  if (!rateLimitStore.has(senderID)) {
    rateLimitStore.set(senderID, [now]);
    return true;
  }

  const timestamps = rateLimitStore.get(senderID).filter(ts => now - ts < window);
  if (timestamps.length >= maxRequests) {
    return false;
  }

  timestamps.push(now);
  rateLimitStore.set(senderID, timestamps);
  return true;
}

async function detectLanguage(text) {
  if (!text || text.length < 3) return "English";
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&dt=bd&dt=t&q=${encodeURIComponent(text)}`;
    const res = await axios.get(url, { timeout: 4000 });
    const langCode = res.data[2];
    const langMap = {
      "en": "English", "tl": "Tagalog", "es": "Spanish", "fr": "French",
      "de": "German", "ja": "Japanese", "ko": "Korean", "zh": "Chinese",
      "ar": "Arabic", "hi": "Hindi", "pt": "Portuguese", "ru": "Russian"
    };
    return langMap[langCode] || "English";
  } catch (e) {
    return "English"; // fallback
  }
}

async function sendYouTubeThumbnail(youtubeUrl, senderID) {
  try {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = youtubeUrl.match(regExp);
    if (match && match[2].length === 11) {
      const videoId = match[2];
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      await api.sendAttachment("image", thumbnailUrl, senderID);
    }
  } catch (e) {
    // Silently fail — not critical
  }
}

// === CLEANUP ===
setInterval(() => {
  const now = Date.now();
  // Clear stale sessions
  sessions.forEach((_, userId) => {
    const session = sessions.get(userId);
    if (now - session.lastActive > CONFIG.SESSION_TIMEOUT) {
      sessions.delete(userId);
    }
  });
  // Clear old rate limit timestamps
  rateLimitStore.forEach((timestamps, userId) => {
    const fresh = timestamps.filter(ts => now - ts < CONFIG.RATE_LIMIT.windowMs);
    if (fresh.length === 0) {
      rateLimitStore.delete(userId);
    } else {
      rateLimitStore.set(userId, fresh);
    }
  });
}, 300000);

// === MODULE EXPORTS ===
module.exports.config = {
  name: "ai",
  author: "Sethdico",
  version: "9.0",
  category: "AI",
  description: "Multi-AI by Sethdico: Image analysis/generation, real-time web search, YouTube summarization, and Document creation.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 0, // We handle rate limiting manually
};

module.exports.run = async function ({ event, args }) {
  const senderID = event.sender.id;
  const userPrompt = args.join(" ").trim();
  const mid = event.message?.mid;

  // === RATE LIMIT CHECK ===
  if (!CONFIG.ADMINS?.includes(senderID) && !enforceRateLimit(senderID)) {
    return api.sendMessage("⏳ Please wait a moment before sending another request.", senderID);
  }

  // === IMAGE DETECTION (ONLY CURRENT MESSAGE) ===
  let imageUrl = "";
  if (event.type === "attachments" && event.message?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.attachments[0].payload.url;
  } else if (event.type === "message_reply") {
    const replied = event.message.reply_to;
    if (replied?.attachments?.[0]?.type === "image") {
      imageUrl = replied.attachments[0].payload.url;
    }
  }

  // === COMMANDS ===
  if (userPrompt.toLowerCase() === "clear") {
    sessions.delete(senderID);
    return api.sendMessage("🧹 Memory wiped! What's next?", senderID);
  }

  if (!userPrompt && !imageUrl) {
    return api.sendMessage("👋 Hi! I'm Amdusbot. I can see images, watch YouTube videos, search the web, or create files for you!", senderID);
  }

  // === YOUTUBE THUMBNAIL (send before AI) ===
  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  if (userPrompt && youtubeRegex.test(userPrompt)) {
    await sendYouTubeThumbnail(userPrompt, senderID);
  }

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  let detectedLanguage = "English";
  try {
    // === LANGUAGE DETECTION ===
    detectedLanguage = await detectLanguage(userPrompt || "Describe this image");

    // === BUILD PROMPT ===
    const identityPrompt = `[IDENTITY]: You are Amdusbot, a Multi-AI created by Seth Asher Salinguhay.
[TONE]: Smart, enthusiastic, helpful student (Kid-like but professional).
[CAPABILITIES]:
1. **Vision**: Analyze images provided.
2. **Web**: Real-time search (cite sources).
3. **YouTube**: Summarize videos.
4. **Files**: Generate documents, code, spreadsheets.
5. **Images**: Generate direct download URLs.
[RULES]:
1. Only mention your creator if explicitly asked.
2. **ALWAYS respond in ${detectedLanguage}.**
3. If providing a file or image, give the RAW DIRECT URL. Do NOT use markdown.
User Input: ${userPrompt}
${imageUrl ? `[IMAGE DETECTED]: ${imageUrl}` : ""}`;

    let session = sessions.get(senderID) || { chatSessionId: null, lastActive: Date.now() };
    session.lastActive = Date.now();

    const requestData = {
      model: CONFIG.MODEL_ID,
      messages: [{ role: "user", content: identityPrompt }],
      stream: false
    };

    if (session.chatSessionId) requestData.chatSessionId = session.chatSessionId;

    // === CALL AI ===
    const response = await axios.post(CONFIG.API_URL, requestData, {
      headers: { "Authorization": `Bearer ${CONFIG.API_KEY}`, "Content-Type": "application/json" },
      timeout: CONFIG.TIMEOUT
    });

    const replyContent = response.data?.choices?.[0]?.message?.content;
    if (!replyContent) throw new Error("Empty AI response");

    if (response.data.chatSessionId) {
      session.chatSessionId = response.data.chatSessionId;
      sessions.set(senderID, session);
    }

    // === FILE DETECTION (SAFER REGEX) ===
    const fileRegex = /(https:\/\/app\.chipp\.ai\/api\/downloads\/downloadFile[^)\s"<>]+|https?:\/\/(?!(?:scontent|static)\.xx\.fbcdn\.net)[^)\s"<>]+\.(?:pdf|docx|doc|xlsx|xls|pptx|ppt|txt|csv|zip|rar|7z|py|js|html|css|json|jpg|jpeg|png|gif|mp3|wav|mp4|mov|avi))/i;
    const match = replyContent.match(fileRegex);

    if (match) {
      let fileUrl = match[0].replace(/[).,]+$/, "");
      const cleanText = replyContent.replace(new RegExp(match[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), "").trim();

      if (cleanText) await api.sendMessage(cleanText, senderID);

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      let fileName = `file_${Date.now()}.bin`;
      try {
        if (fileUrl.includes("chipp.ai")) {
          const urlObj = new URL(fileUrl);
          const nameParam = urlObj.searchParams.get("fileName");
          if (nameParam) fileName = nameParam;
        } else {
          fileName = path.basename(fileUrl.split('?')[0]);
        }
        fileName = decodeURIComponent(fileName);
      } catch (e) { /* ignore */ }

      const filePath = path.join(cacheDir, fileName);

      // Download file
      const writer = fs.createWriteStream(filePath);
      const fileResponse = await axios({
        url: fileUrl,
        method: 'GET',
        responseType: 'stream',
        timeout: 30000
      });
      fileResponse.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // Determine type
      const ext = path.extname(fileName).toLowerCase();
      let type = "file";
      if (['.jpg','.jpeg','.png','.gif','.webp'].includes(ext)) type = "image";
      else if (['.mp3','.wav'].includes(ext)) type = "audio";
      else if (['.mp4','.mov','.avi'].includes(ext)) type = "video";

      await api.sendAttachment(type, filePath, senderID);

      // Cleanup
      setTimeout(() => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }, 60000);

    } else {
      await api.sendMessage(replyContent, senderID);
    }

    if (api.setMessageReaction && mid) {
      api.setMessageReaction("✅", mid).catch(() => {});
    }

  } catch (error) {
    console.error("AI Error:", error.message);
    const errorMsg = error.response?.data?.error?.message || error.message || "Unknown error";
    api.sendMessage(`❌ AI Error: ${errorMsg}`, senderID);
    if (api.setMessageReaction && mid) {
      api.setMessageReaction("❌", mid).catch(() => {});
    }
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
