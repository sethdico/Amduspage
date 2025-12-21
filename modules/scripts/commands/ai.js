const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

// === CONFIGURATION ===
const CONFIG = {
  API_URL: "https://app.chipp.ai/api/v1/chat/completions",
  API_KEY: process.env.CHIPP_API_KEY, 
  MODEL_ID: "newapplication-10034686",
  TIMEOUT: 120000,
  RATE_LIMIT: { requests: 10, windowMs: 60000 } // Bumped slightly for usability
};

// Memory Storage
const sessions = new Map();
const rateLimitStore = new Map();

// --- 🛡️ MEMORY CLEANER (Garbage Collector) ---
// Runs every hour to remove sessions older than 2 hours to prevent crashing
setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions) {
        if (now - session.lastActivity > 2 * 60 * 60 * 1000) {
            sessions.delete(id);
        }
    }
    // Clear rate limits too
    rateLimitStore.clear();
}, 60 * 60 * 1000);


// === HELPERS ===
async function detectLanguage(text) {
  if (!text || text.length < 3) return "English";
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&dt=t&q=${encodeURIComponent(text)}`;
    const res = await axios.get(url, { timeout: 3000 });
    const langCode = res.data[2];
    const langMap = { "en": "English", "tl": "Tagalog", "es": "Spanish", "fr": "French", "ja": "Japanese", "ko": "Korean" };
    return langMap[langCode] || "English";
  } catch (e) { return "English"; }
}

async function sendYouTubeThumbnail(youtubeUrl, senderID) {
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
  version: "19.0-Stable", 
  category: "AI",
  description: "Advanced AI by Seth Asher: ToT Reasoning, CoVe Verification, Vision, Files & Interactive Buttons.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 0, 
};

module.exports.run = async function ({ event, args }) {
  const senderID = event.sender.id;
  const userPrompt = args.join(" ").trim();
  const mid = event.message?.mid;

  // 1. Safety Checks
  if (!CONFIG.API_KEY) return api.sendMessage("❌ System Error: CHIPP_API_KEY is missing.", senderID);
  
  // 2. Rate Limiting
  const now = Date.now();
  const userTs = rateLimitStore.get(senderID) || [];
  const recentTs = userTs.filter(ts => now - ts < CONFIG.RATE_LIMIT.windowMs);
  if (recentTs.length >= CONFIG.RATE_LIMIT.requests) return api.sendMessage("⏳ Too fast! Please wait a moment.", senderID);
  recentTs.push(now);
  rateLimitStore.set(senderID, recentTs);

  // 3. Context Detection
  let imageUrl = "";
  const isSticker = !!event.message?.sticker_id;

  if (event.message?.attachments?.[0]?.type === "image" && !isSticker) {
    imageUrl = event.message.attachments[0].payload.url;
  } else if (event.message?.reply_to?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.reply_to.attachments[0].payload.url;
  }

  // 4. Input Handling
  if (userPrompt.toLowerCase() === "clear") { 
      sessions.delete(senderID); 
      return api.sendMessage("🧹 Conversation memory cleared.", senderID); 
  }

  if (isSticker && !userPrompt) return; 
  if (imageUrl && !userPrompt) {
    return api.sendMessage("🖼️ I see the image! What should I do? (Analyze, Edit, or Extract text?)", senderID);
  }
  if (!userPrompt && !imageUrl) return api.sendMessage("👋 Hi! I'm Amdusbot. Ask me anything or send an image!", senderID);

  // 5. YouTube Handling
  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  if (userPrompt && youtubeRegex.test(userPrompt)) {
    await sendYouTubeThumbnail(userPrompt, senderID);
  }

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    const lang = await detectLanguage(userPrompt);

    // =================================================================
    // 🧠 SYSTEM PROMPT (Optimized)
    // =================================================================
    const identityPrompt = `
[SYSTEM]: You are Amdusbot, an AI Assistant by Sethdico.
[LANGUAGE]: Respond in ${lang}.

[CORE PROTOCOLS]:
1. INTELLECTUAL HONESTY: Never guess. Say "I am not sure" if unknown.
2. THINKING: For complex questions, list 3 approaches before answering (Tree of Thoughts).
3. VERIFICATION: Verify technical facts before answering (Chain of Verification).

[CAPABILITIES]:
1. VISION: Analyze [IMAGE CONTEXT] if present.
2. WEB SEARCH: Cite sources [Source](URL).
3. FILES: Provide RAW DIRECT URLs only.

[INSTRUCTIONS]:
- Keep responses concise (under 2000 chars).
- If asked "Who made you?", answer: "Seth Asher Salinguhay (Sethdico)".
`.trim();

    let session = sessions.get(senderID) || { chatSessionId: null, lastActivity: Date.now() };
    session.lastActivity = Date.now(); // Update activity time

    const response = await axios.post(CONFIG.API_URL, {
      model: CONFIG.MODEL_ID,
      messages: [{ 
        role: "user", 
        content: `${identityPrompt}\n\nUser Input: ${userPrompt}\n${imageUrl ? `[IMAGE CONTEXT]: ${imageUrl}` : ""}` 
      }],
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

    // =================================================================
    // 📂 ROBUST FILE HANDLING (Full Code Restored)
    // =================================================================
    const fileRegex = /(https?:\/\/app\.chipp\.ai\/api\/downloads\/downloadFile[^)\s"]+|https?:\/\/(?!(?:scontent|static)\.xx\.fbcdn\.net)[^)\s"]+\.(?:pdf|docx|doc|xlsx|xls|pptx|ppt|txt|csv|zip|rar|7z|jpg|jpeg|png|gif|mp3|wav|mp4))/i;
    const match = replyContent.match(fileRegex);

    if (match) {
      const fileUrl = match[0].replace(/[).,]+$/, ""); 
      const textMessage = replyContent.replace(match[0], "").trim();
      
      if (textMessage) await api.sendMessage(textMessage, senderID);

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      let fileName = "file.bin";
      try {
          if (fileUrl.includes("chipp.ai")) {
            const urlObj = new URL(fileUrl);
            fileName = urlObj.searchParams.get("fileName") || `amdus_gen_${Date.now()}.pdf`;
          } else {
            fileName = path.basename(fileUrl.split('?')[0]);
          }
          fileName = decodeURIComponent(fileName).replace(/[^a-zA-Z0-9._-]/g, "_"); 
      } catch (e) { fileName = `file_${Date.now()}.bin`; }

      const filePath = path.join(cacheDir, fileName);
      const fileWriter = fs.createWriteStream(filePath);

      try {
          const fileRes = await axios({ url: fileUrl, method: 'GET', responseType: 'stream' });
          fileRes.data.pipe(fileWriter);

          await new Promise((resolve, reject) => {
              fileWriter.on('finish', resolve);
              fileWriter.on('error', reject);
          });

          const stats = fs.statSync(filePath);
          if (stats.size > 24 * 1024 * 1024) {
             await api.sendMessage(`📂 File is too large to send (Over 25MB).\nDownload here: ${fileUrl}`, senderID);
          } else {
             const ext = path.extname(fileName).toLowerCase();
             const type = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext) ? "image" : "file";
             await api.sendAttachment(type, filePath, senderID);
          }

      } catch (downloadError) {
          console.error("Download Failed:", downloadError.message);
          await api.sendMessage(`📂 I created the file, but couldn't attach it directly.\n\nDownload here: ${fileUrl}`, senderID);
      } finally {
          setTimeout(() => { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }, 60000);
      }

    } else {
      // =================================================================
      // 🔄 SAFE RESPONSE + BUTTONS
      // =================================================================
      
      // 1. Send the long AI text safely FIRST
      await api.sendMessage(replyContent, senderID);

      // 2. Determine Payload (Safe Length)
      // Payloads have a 1000 char limit. If the user prompt was massive, truncate it for the button.
      const safePayload = userPrompt.length > 900 ? userPrompt.slice(0, 900) : userPrompt;

      // 3. Send the interaction buttons as a SEPARATE small message
      // This prevents the "Message Too Long" crash
      const buttons = [
        {
            type: "postback",
            title: "🔄 Regenerate",
            payload: safePayload
        },
        {
            type: "postback",
            title: "👶 Simplify",
            payload: `Explain this simply: ${safePayload}`
        },
        {
            type: "postback",
            title: "📜 Summarize",
            payload: `Summarize the previous answer`
        }
      ];

      await api.sendButton("💡 **What next?**", buttons, senderID);
    }

    if (api.setMessageReaction) api.setMessageReaction("✅", mid);

  } catch (error) {
    console.error("AI Main Error:", error.message);
    api.sendMessage("❌ I encountered a glitch. Please ask again.", senderID);
    if (api.setMessageReaction) api.setMessageReaction("❌", mid);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
