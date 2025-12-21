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
  RATE_LIMIT: { requests: 10, windowMs: 60000 }
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
  version: "20.5-HybridBrain", 
  category: "AI",
  description: "Advanced AI: ToT/CoVe for Logic, Creative Mode for Art/Editing.",
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
    // 🧠 DYNAMIC PROMPT SWITCHING
    // =================================================================
    
    // Detect "Creative Intent"
    const isCreation = /\b(draw|generate|create|make)\b.*\b(image|art|picture|photo|sketch)\b/i.test(userPrompt) || /\b(draw|paint)\b/i.test(userPrompt);
    const isEditing = imageUrl && /\b(edit|change|modify|remove|add)\b/i.test(userPrompt);
    const isCreativeMode = isCreation || isEditing;

    let systemPrompt = "";

    if (isCreativeMode) {
        // --- 🎨 CREATIVE MODE ---
        // Forces AI to ignore logic rules and focus on art generation instructions
        systemPrompt = `
[SYSTEM]: You are Amdusbot, in CREATIVE MODE.
[LANGUAGE]: Respond in ${lang}.
[GOAL]: The user wants to generate or edit an image.
[INSTRUCTIONS]: 
- Ignore "Tree of Thoughts" logic.
- Be highly descriptive, imaginative, and artistic.
- If editing, describe the visual changes vividly.
`.trim();

    } else {
        // --- 🧠 ANALYTICAL MODE ---
        // Forces AI to use ToT and CoVe for logic/questions
        systemPrompt = `
[SYSTEM]: You are Amdusbot, in ANALYTICAL MODE.
[LANGUAGE]: Respond in ${lang}.

[CORE PROTOCOLS]:
1. INTELLECTUAL HONESTY: Never guess. Say "I am not sure" if unknown.
2. TREE OF THOUGHTS (ToT): For complex questions, list 3 approaches before answering.
3. CHAIN OF VERIFICATION (CoVe): Verify technical facts before answering.

[CAPABILITIES]:
1. VISION: Analyze [IMAGE CONTEXT] detailedly.
2. FILES: Provide RAW DIRECT URLs only.
`.trim();
    }

    let session = sessions.get(senderID) || { chatSessionId: null, lastActivity: Date.now() };
    session.lastActivity = Date.now(); 

    const response = await axios.post(CONFIG.API_URL, {
      model: CONFIG.MODEL_ID,
      messages: [{ 
        role: "user", 
        content: `${systemPrompt}\n\nUser Input: ${userPrompt}\n${imageUrl ? `[IMAGE CONTEXT]: ${imageUrl}` : ""}` 
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
    // 📂 FILE HANDLING
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
      
      // 1. Send the text FIRST (Prevents button crash if text is long)
      await api.sendMessage(replyContent, senderID);

      // 2. Prepare Payload (Truncated for safety)
      const safePayload = userPrompt.length > 900 ? userPrompt.slice(0, 900) : userPrompt;

      // 3. Construct Buttons based on Mode
      const buttons = [
        {
            type: "postback",
            title: "🔄 Regenerate",
            payload: safePayload
        },
        {
            type: "postback",
            title: "📜 Summarize",
            payload: `Summarize the previous answer`
        }
      ];

      // Add "Simplify" button ONLY if not in Creative Mode
      if (!isCreativeMode) {
          buttons.splice(1, 0, {
            type: "postback",
            title: "👶 Simplify",
            payload: `Explain this simply: ${safePayload}`
          });
      }

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
