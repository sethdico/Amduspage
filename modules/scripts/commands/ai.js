const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

// === CONFIGURATION ===
const CONFIG = {
  API_URL: "https://app.chipp.ai/api/v1/chat/completions",
  // TRULY PRIVATE: No hardcoded key here. 
  // You MUST set "CHIPP_API_KEY" in Render Dashboard -> Environment.
  API_KEY: process.env.CHIPP_API_KEY, 
  MODEL_ID: "newapplication-10034686",
  TIMEOUT: 120000,
  SESSION_TIMEOUT: 30 * 60 * 1000,
  RATE_LIMIT: { requests: 5, windowMs: 60000 }
};

const sessions = new Map();
const rateLimitStore = new Map();

// === HELPERS ===
async function detectLanguage(text) {
  try {
    const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&dt=t&q=${encodeURIComponent(text || "hi")}`, { timeout: 4000 });
    const langMap = { "en": "English", "tl": "Tagalog", "es": "Spanish", "fr": "French", "ja": "Japanese" };
    return langMap[res.data[2]] || "English";
  } catch (e) { return "English"; }
}

module.exports.config = {
  name: "ai",
  author: "Sethdico",
  version: "14.0", 
  category: "AI",
  description: "Multi-AI by Sethdico: Image analysis/gen, real-time info, YouTube summaries, and Documents.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 0, 
};

module.exports.run = async function ({ event, args }) {
  const senderID = event.sender.id;
  const userPrompt = args.join(" ").trim();
  const mid = event.message?.mid;

  // 1. Check if API Key exists in Render
  if (!CONFIG.API_KEY) {
      return api.sendMessage("❌ System Error: API Key is not configured in Render Environment Variables.", senderID);
  }

  // 2. Rate Limit Check
  const now = Date.now();
  const userTs = rateLimitStore.get(senderID) || [];
  const recentTs = userTs.filter(ts => now - ts < CONFIG.RATE_LIMIT.windowMs);
  if (recentTs.length >= CONFIG.RATE_LIMIT.requests) return api.sendMessage("⏳ Too fast! Take a breath.", senderID);
  recentTs.push(now);
  rateLimitStore.set(senderID, recentTs);

  // 3. Optimized Image Detection (Ignore Stickers/Likes)
  let imageUrl = "";
  const isSticker = !!event.message?.sticker_id;

  if (event.message?.attachments?.[0]?.type === "image" && !isSticker) {
      imageUrl = event.message.attachments[0].payload.url;
  } else if (event.message?.reply_to?.attachments?.[0]?.type === "image") {
      imageUrl = event.message.reply_to.attachments[0].payload.url;
  }

  // 4. Command Handlers
  if (userPrompt.toLowerCase() === "clear") { 
      sessions.delete(senderID); 
      return api.sendMessage("🧹 Memory wiped! Ready for a fresh start.", senderID); 
  }

  // --- IMAGE GREETING (IGNORE LIKES) ---
  if (imageUrl && !userPrompt && !isSticker) {
    return api.sendMessage(
        "What can I do with this image for you? I can edit it, analyze it, and more. Just reply to the image with your instruction!", 
        senderID
    );
  }

  // Ignore if only a Like/Sticker was sent
  if (isSticker && !userPrompt) return;

  if (!userPrompt && !imageUrl) return api.sendMessage("👋 Hi! I'm Amdusbot. Send an image, ask a question, or tell me to create a file!", senderID);

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    const lang = await detectLanguage(userPrompt);

    // 5. IMPROVED PERSONA PROMPT
    const identityPrompt = `[IDENTITY]: You are Amdusbot, a Multi-AI created by Seth Asher Salinguhay.
[TONE]: Smart, helpful, and enthusiastic student (kid genius). 
[CAPABILITIES]: 1. Vision: Analyze images. 2. Web: Real-time search. 3. YouTube: Summarize videos. 4. Files: Generate documents. 5. Image Gen: Create images.
[RULES]: 
- ALWAYS respond in ${lang}.
- ONLY mention Sethdico if asked "Who made you?".
- Provide RAW direct URLs for files/images. No markdown.
- Always search online and cite sources with links.`;

    let session = sessions.get(senderID) || { chatSessionId: null, lastActive: Date.now() };
    session.lastActive = Date.now();

    const response = await axios.post(CONFIG.API_URL, {
      model: CONFIG.MODEL_ID,
      messages: [{ role: "user", content: `${identityPrompt}\n\nUser Request: ${userPrompt}\n${imageUrl ? `[IMAGE CONTEXT]: ${imageUrl}` : ""}` }],
      chatSessionId: session.chatSessionId,
      stream: false
    }, {
      headers: { "Authorization": `Bearer ${CONFIG.API_KEY}`, "Content-Type": "application/json" },
      timeout: CONFIG.TIMEOUT
    });

    const replyContent = response.data?.choices?.[0]?.message?.content;
    if (response.data.chatSessionId) {
      session.chatSessionId = response.data.chatSessionId;
      sessions.set(senderID, session);
    }

    // 6. FILE DOWNLOADER LOGIC
    const fileRegex = /(https?:\/\/app\.chipp\.ai\/api\/downloads\/downloadFile[^)\s"]+|https?:\/\/(?!(?:scontent|static)\.xx\.fbcdn\.net)[^)\s"]+\.(?:pdf|docx|doc|xlsx|xls|pptx|ppt|txt|csv|zip|rar|7z|py|js|html|css|json|jpg|jpeg|png|gif|mp3|wav|mp4|mov|avi))/i;
    const match = replyContent.match(fileRegex);

    if (match) {
      const fileUrl = match[0].replace(/[).,]+$/, "");
      const cleanText = replyContent.replace(match[0], "").trim();
      if (cleanText) await api.sendMessage(cleanText, senderID);

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      let fileName = fileUrl.includes("chipp.ai") ? (new URL(fileUrl).searchParams.get("fileName") || `file_${Date.now()}.bin`) : path.basename(fileUrl.split('?')[0]);
      fileName = decodeURIComponent(fileName);
      const filePath = path.join(cacheDir, fileName);

      const writer = fs.createWriteStream(filePath);
      const fileRes = await axios({ url: fileUrl, method: 'GET', responseType: 'stream' });
      fileRes.data.pipe(writer);
      await new Promise((r) => writer.on('finish', r));

      const ext = path.extname(fileName).toLowerCase();
      let type = [".jpg",".jpeg",".png",".gif"].includes(ext) ? "image" : ([".mp3",".wav"].includes(ext) ? "audio" : ([".mp4"].includes(ext) ? "video" : "file"));

      await api.sendAttachment(type, filePath, senderID);
      setTimeout(() => { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }, 60000);
    } else {
      await api.sendMessage(replyContent, senderID);
    }
    
    if (api.setMessageReaction) api.setMessageReaction("✅", mid);

  } catch (error) {
    api.sendMessage("❌ AI Error: " + error.message, senderID);
    if (api.setMessageReaction) api.setMessageReaction("❌", mid);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
