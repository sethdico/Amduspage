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

// FEATURE: YouTube Thumbnail Logic (Fixed URL typo)
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
  version: "16.99-FinalSync",
  category: "AI",
  description: "Advanced AI with working Vision, YouTube, and Files.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 0, 
};

module.exports.run = async function ({ event, args, api, reply }) {
  const senderID = event.sender.id;
  const userPrompt = args.join(" ").trim();
  const apiKey = process.env.CHIPP_API_KEY;

  if (!apiKey) return reply("❌ chipp_api_key missing on render.");
  
  // 1. RAM Safety & Session Init
  if (!global.sessions) global.sessions = new Map();
  if (global.sessions.size > 100) global.sessions.delete(global.sessions.keys().next().value);

  // 2. WORKING IMAGE DETECTION (Matches your reference code)
  let imageUrl = "";
  if (event.message?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.attachments[0].payload.url;
  } else if (event.message?.reply_to?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.reply_to.attachments[0].payload.url;
  }

  if (userPrompt.toLowerCase() === "clear") { 
      global.sessions.delete(senderID); 
      return reply("🧹 cleared memory."); 
  }
  
  if (imageUrl && !userPrompt && !event.message?.reply_to) {
      return reply("🖼️ I see the image. Reply to it and type your instructions.");
  }
  if (!userPrompt && !imageUrl) return reply("👋 hi. i'm amdusbot. i can search, see images, and write files.");

  // 3. YouTube Thumbnail Feature
  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  if (userPrompt && youtubeRegex.test(userPrompt)) await sendYouTubeThumbnail(userPrompt, senderID, api);

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    // RESTORED: Identity Prompt (CoVe + ToT)
    const identityPrompt = `[SYSTEM]: Amdusbot. You are helpful wise ai that uses cove and tot but only sends the final message without the reasoning, if not sure admit it rather than guess and hallucinates make sure everything is accurate. Response limit 2000 chars. you are made by Seth Asher Salinguhay.`;
    
    let sessionData = global.sessions.get(senderID) || { chatSessionId: null };

    const response = await fetchWithRetry(async () => {
        // MATCHED: The specific way your 'previous code' combined instructions and images
        const contentWithImage = `${identityPrompt}\n\nInput: ${userPrompt}${imageUrl ? `\n[IMAGE]: ${imageUrl}` : ""}`;

        return http.post(CONFIG.API_URL, {
          model: CONFIG.MODEL_ID,
          messages: [{ role: "user", content: contentWithImage }],
          chatSessionId: sessionData.chatSessionId,
          stream: false
        }, {
          headers: { "Authorization": `Bearer ${apiKey}` },
          timeout: CONFIG.TIMEOUT
        });
    });

    if (response.data.chatSessionId) global.sessions.set(senderID, { chatSessionId: response.data.chatSessionId });

    // Using our Master Parser (improved to handle .choices[0].message.content)
    const replyContent = parseAI(response);

    if (!replyContent) return reply("❌ AI returned no response.");

    // 4. File/Image Generation Flow
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

      await new Promise((resolve) => writer.on('finish', resolve));
      await api.sendAttachment(fileName.match(/\.(jpg|png|jpeg)$/i) ? "image" : "file", filePath, senderID);
      setTimeout(async () => { try { await fsPromises.unlink(filePath); } catch(e) {} }, 10000);
    } else {
      await reply(replyContent);
    }
  } catch (error) {
    console.error("AI Error:", error.message);
    reply("❌ ai glitch. try again.");
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
