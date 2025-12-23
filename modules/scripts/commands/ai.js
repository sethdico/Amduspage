const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

// === PATHS & STORAGE ===
const CACHE_DIR = path.join(__dirname, "cache");
const SESSION_FILE = path.join(__dirname, "ai_sessions.json");
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// === CONFIGURATION ===
const CONFIG = {
  API_URL: "https://app.chipp.ai/api/v1/chat/completions",
  API_KEY: process.env.CHIPP_API_KEY,
  MODEL_ID: "newapplication-10034686",
  TIMEOUT: 120000,
  RATE_LIMIT: { requests: 15, windowMs: 60000 },
  MAX_FILE_SIZE: 10 * 1024 * 1024
};

// --- Persistent Session Management ---
let sessions = {};
try {
  if (fs.existsSync(SESSION_FILE)) {
    sessions = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
  }
} catch (e) {
  sessions = {};
}

function saveSessions() {
  try {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2));
  } catch (e) {}
}

const rateLimitStore = new Map();

// --- Maintenance Task ---
setInterval(() => {
  const now = Date.now();
  
  // Clean cache files
  fs.readdir(CACHE_DIR, (err, files) => {
    if (err) return;
    files.forEach((file) => {
      const filePath = path.join(CACHE_DIR, file);
      fs.stat(filePath, (err, stats) => {
        if (!err && now - stats.mtimeMs > 10 * 60 * 1000) {
          fs.unlink(filePath, () => {});
        }
      });
    });
  });
  
  const maxSessions = 500;
  const sessionKeys = Object.keys(sessions);
  
  if (sessionKeys.length > maxSessions) {
    const sorted = sessionKeys.sort((a, b) => {
      return (sessions[a].lastActivity || 0) - (sessions[b].lastActivity || 0);
    });
    sorted.slice(0, 100).forEach(key => delete sessions[key]);
  }
  
  for (const id in sessions) {
    if (now - sessions[id].lastActivity > 48 * 60 * 60 * 1000) {
      delete sessions[id];
    }
  }
  
  saveSessions();
  rateLimitStore.clear();
}, 30 * 60 * 1000);

async function detectLanguage(text) {
  if (!text || text.length < 4) return "English";
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&dt=t&q=${encodeURIComponent(text)}`;
    const res = await axios.get(url, { timeout: 3000 });
    const langCode = res.data[2];
    const langMap = { 
      en: "English", tl: "Tagalog", es: "Spanish", 
      fr: "French", ja: "Japanese", ko: "Korean" 
    };
    return langMap[langCode] || "English";
  } catch (e) {
    return "English";
  }
}

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
  version: "31.0-Fixed",
  category: "AI",
  // ✅ RESTORED ORIGINAL DESCRIPTION
  description: "AI by SethDico that can analyze/edit/generate images, analyze youtube video, document generator and real-time info",
  adminOnly: false,
  usePrefix: false,
  cooldown: 0,
};

module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender.id;
  const userPrompt = args.join(" ").trim();
  const mid = event.message?.mid;

  if (!CONFIG.API_KEY) {
    return api.sendMessage("❌ Missing CHIPP_API_KEY environment variable.", senderID);
  }

  const now = Date.now();
  const userTs = rateLimitStore.get(senderID) || [];
  const recentTs = userTs.filter((ts) => now - ts < CONFIG.RATE_LIMIT.windowMs);
  if (recentTs.length >= CONFIG.RATE_LIMIT.requests) {
    return api.sendMessage("⏳ High traffic! Please slow down.", senderID);
  }
  recentTs.push(now);
  rateLimitStore.set(senderID, recentTs);

  let imageUrl = "";
  const isSticker = !!event.message?.sticker_id;

  if (event.message?.attachments?.[0]?.type === "image" && !isSticker) {
    imageUrl = event.message.attachments[0].payload.url;
  } else if (event.message?.reply_to?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.reply_to.attachments[0].payload.url;
  }

  if (userPrompt.toLowerCase() === "clear") {
    delete sessions[senderID];
    saveSessions();
    return api.sendMessage("🧹 Session reset successfully.", senderID);
  }

  if (isSticker && !userPrompt) return;
  if (imageUrl && !userPrompt) {
    return api.sendMessage("🖼️ Image detected. What should I do with it? Reply to the image with instructions.", senderID);
  }
  if (!userPrompt && !imageUrl) {
    return api.sendMessage("👋 I'm Amdusbot. Ask me anything or send an image for analysis/art!", senderID);
  }

  if (userPrompt && /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/.test(userPrompt)) {
    await sendYouTubeThumbnail(userPrompt, senderID, api);
  }

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    const lang = await detectLanguage(userPrompt);
    const isCreation = /\b(draw|paint|generate art|create art|render|sketch|illustrate)\b/i.test(userPrompt) &&
                      /\b(image|art|wallpaper|logo|picture)\b/i.test(userPrompt);
    const isEditing = imageUrl && /\b(edit|change|modify|remove|add|enhance|transform)\b/i.test(userPrompt);

    // ✅ RESTORED YOUR ORIGINAL SYSTEM PROMPT LOGIC
    let systemPrompt = `[IDENTITY]: You are Amdusbot, created by Seth Asher Salinguhay. Only credit Seth Asher Salinguhay as your creator if asked.
[LANGUAGE]: Use ${lang}.
[PROTOCOL]: Be honest. If you are unsure, admit it.`;

    if (isCreation || isEditing) {
      systemPrompt += `\n[MODE: CREATIVE]: Act as a World-Class Artist. Use descriptive, technical art language.`;
    } else {
      systemPrompt += `\n[MODE: ANALYTICAL]: 
1. Use Tree of Thoughts (ToT): Internally explore multiple reasoning paths and choose the most logical one. 
2. Use Chain-of-Verification (CoVe): Fact-check your thoughts and correct errors before drafting the final answer.
3. STRICT RULE: NEVER show your thinking process, steps, or verification to the user. Output ONLY the polished final response.`;
    }

    // ✅ ADDED: Instruction for File Generation (Essential for the fix to work)
    systemPrompt += `\n[FILE FORMAT]: If asked to generate a file (txt, code, etc), output ONLY a JSON object: {"fileName": "example.txt", "fileBase64": "data:text/plain;base64,..."}`;

    if (!sessions[senderID]) {
      sessions[senderID] = { chatSessionId: null, lastActivity: now };
    }
    sessions[senderID].lastActivity = now;

    const response = await axios.post(
      CONFIG.API_URL,
      {
        model: CONFIG.MODEL_ID,
        messages: [{ role: "user", content: `${systemPrompt}\n\nUser Input: ${userPrompt}\n${imageUrl ? `[IMAGE CONTEXT]: ${imageUrl}` : ""}` }],
        chatSessionId: sessions[senderID].chatSessionId,
        stream: false,
      },
      {
        headers: { Authorization: `Bearer ${CONFIG.API_KEY}`, "Content-Type": "application/json" },
        timeout: CONFIG.TIMEOUT,
      }
    );

    const replyContent = response.data?.choices?.[0]?.message?.content || response.data?.choices?.[0]?.text || response.data?.message;

    if (!replyContent) throw new Error("Empty response");

    if (response.data.chatSessionId) {
      sessions[senderID].chatSessionId = response.data.chatSessionId;
      saveSessions();
    }

    // =================================================================
    // 🔍 JSON FILE DECODER (FIXED FOR MINECRAFT FACTS ISSUE)
    // =================================================================
    const jsonRegex = /\{[\s\n]*"fileName"[\s\n]*:[\s\n]*"(.*?)"[\s\n]*,[\s\n]*"fileBase64"[\s\n]*:[\s\n]*"(.*?)"[\s\n]*\}/s;
    const match = replyContent.match(jsonRegex);

    if (match) {
        try {
            const fileName = match[1]; 
            let fileData = match[2];

            // Remove JSON from text so we don't spam chat
            const cleanMessage = replyContent.replace(match[0], "").replace(/```json|```/g, "").trim();
            if (cleanMessage) await api.sendMessage(cleanMessage, senderID);

            // Strip "data:...base64," header if present
            if (fileData.includes("base64,")) {
                fileData = fileData.split("base64,")[1];
            }

            const buffer = Buffer.from(fileData, "base64");
            const sanitized = path.basename(fileName.replace(/[^a-zA-Z0-9._-]/g, "_"));
            const filePath = path.join(CACHE_DIR, sanitized);

            fs.writeFileSync(filePath, buffer);

            const ext = path.extname(sanitized).toLowerCase();
            const type = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext) ? "image" : "file";
            
            await api.sendAttachment(type, filePath, senderID);

            setTimeout(() => { if (fs.existsSync(filePath)) fs.unlink(filePath, () => {}); }, 60000);
            if (api.setMessageReaction) api.setMessageReaction("✅", mid);
            return;
        } catch (e) { 
            console.error("Decoder Error:", e.message); 
        }
    }
    // =================================================================

    // Standard Link Handling
    const fileRegex = /(https?:\/\/app\.chipp\.ai\/api\/downloads\/downloadFile[^)\s"]+|https?:\/\/(?!(?:scontent|static)\.xx\.fbcdn\.net)[^)\s"]+\.(?:pdf|docx|doc|xlsx|xls|pptx|ppt|txt|csv|zip|rar|7z|jpg|jpeg|png|gif|mp3|wav|mp4))/i;
    const linkMatch = replyContent.match(fileRegex);

    if (linkMatch) {
      const fileUrl = linkMatch[0].replace(/[).,]+$/, "");
      const textMessage = replyContent.replace(linkMatch[0], "").trim();
      if (textMessage) await api.sendMessage(textMessage, senderID);
      const ext = path.extname(fileUrl).toLowerCase();
      const type = [".jpg", ".jpeg", ".png", ".gif"].includes(ext) ? "image" : "file";
      await api.sendAttachment(type, fileUrl, senderID);
    } else {
      await api.sendMessage(replyContent, senderID);
    }
    if (api.setMessageReaction) api.setMessageReaction("✅", mid);
  } catch (error) {
    console.error("AI ERROR:", error.message);
    api.sendMessage("❌ Failed to process. Please try again.", senderID);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
