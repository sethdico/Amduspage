const axios = require("axios");
const fs = require("fs");
const path = require("path");

const CONFIG = {
    API_URL: "https://app.chipp.ai/api/v1/chat/completions",
    API_KEY: "live_561eee985c6d2d0523948b29c4188049697df36dd8677c7471bb74de4112cd35",
    MODEL_ID: "newapplication-10034686", 
    TIMEOUT: 60000, 
    SESSION_TIMEOUT: 30 * 60 * 1000, 
};

const sessions = new Map();

// Garbage Collection
setInterval(() => {
    const now = Date.now();
    sessions.forEach((session, userId) => {
        if (now - session.lastActive > CONFIG.SESSION_TIMEOUT) sessions.delete(userId);
    });
}, 300000);

module.exports.config = {
  name: "ai",
  author: "Sethdico",
  version: "3.5",
  category: "AI",
  description: "Multi AI by sethdico that has image recognition/generation/edit, real-time info, sees youtubes via link and makes documents.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event, args }) {
    const senderID = event.sender.id;
    const userPrompt = args.join(" ").trim();
    const mid = event.message?.mid;
    
    // 1. DETECT INPUT IMAGE (User sending image to AI)
    let imageUrl = "";
    if (event.message?.attachments?.[0]?.type === "image") {
        imageUrl = event.message.attachments[0].payload.url;
    } else if (event.message?.reply_to?.attachments?.[0]?.type === "image") {
        imageUrl = event.message.reply_to.attachments[0].payload.url;
    }

    // 2. CLEAR MEMORY
    if (userPrompt.toLowerCase() === "clear") {
        sessions.delete(senderID);
        return api.sendMessage("🧹 Memory cleared.", senderID);
    }

    if (!userPrompt && !imageUrl) {
        return api.sendMessage("👋 Hello! I can chat, see images, or generate files (PDF/DOCX) for you.", senderID);
    }

    // Indicate processing
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

    try {
        // 3. PROMPT ENGINEERING
        const identityPrompt = `[IDENTITY]: You are Amdusbot. made by SETH ASHER SALINGUHAY say it whenever asked
[CAPABILITIES]: You can generate files. If asked for a document, code, or image, provide a direct download URL.
[INSTRUCTION]: If the user asks for a file, your response MUST contain a valid URL ending in .pdf, .docx, .png, etc.
User: ${userPrompt}
${imageUrl ? `[IMAGE_URL]: ${imageUrl}` : ""}`;

        let session = sessions.get(senderID) || { chatSessionId: null, lastActive: Date.now() };
        session.lastActive = Date.now();

        const requestData = {
            model: CONFIG.MODEL_ID,
            messages: [{ role: "user", content: identityPrompt }],
            stream: false
        };
        if (session.chatSessionId) requestData.chatSessionId = session.chatSessionId;

        // 4. CALL AI API
        const response = await axios.post(CONFIG.API_URL, requestData, {
            headers: { "Authorization": `Bearer ${CONFIG.API_KEY}`, "Content-Type": "application/json" },
            timeout: CONFIG.TIMEOUT
        });

        const replyContent = response.data?.choices?.[0]?.message?.content;
        if (!replyContent) throw new Error("Empty response");

        if (response.data.chatSessionId) {
            session.chatSessionId = response.data.chatSessionId;
            sessions.set(senderID, session);
        }

        // 5. DETECT GENERATED FILE LINKS (The Logic you wanted)
        // This Regex matches images AND documents (pdf, docx, xlsx, etc)
        const urlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|pdf|docx|xlsx|mp3|mp4)(\?[^\s]*)?)/i;
        const match = replyContent.match(urlRegex);

        if (match) {
            const fileUrl = match[0];
            const cleanText = replyContent.replace(match[0], "").trim();

            // Send the text part first (if any)
            if (cleanText) await api.sendMessage(cleanText, senderID);

            // --- DOWNLOAD & SEND LOGIC ---
            
            // Create cache directory
            const cacheDir = path.join(__dirname, "cache");
            if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

            // Determine extension and filename
            // We strip query params to get clean extension
            const cleanUrl = fileUrl.split('?')[0]; 
            const ext = path.extname(cleanUrl) || ".bin";
            const fileName = `file_${Date.now()}${ext}`;
            const filePath = path.join(cacheDir, fileName);

            console.log(`📥 Downloading file: ${fileName}`);

            // Download Stream
            const writer = fs.createWriteStream(filePath);
            const fileResponse = await axios({
                url: fileUrl,
                method: 'GET',
                responseType: 'stream'
            });
            fileResponse.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            // Determine Facebook Attachment Type
            let type = "file"; // Default for PDF, DOCX, etc.
            if (['.jpg','.jpeg','.png','.gif'].includes(ext.toLowerCase())) type = "image";
            else if (['.mp3','.wav','.ogg'].includes(ext.toLowerCase())) type = "audio";
            else if (['.mp4'].includes(ext.toLowerCase())) type = "video";

            // Send the downloaded file
            await api.sendAttachment(type, filePath, senderID);

            // Delete after 1 minute (Cleanup)
            setTimeout(() => {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`🗑️ Deleted: ${fileName}`);
                }
            }, 60000);

        } else {
            // Normal Text Message
            await api.sendMessage(replyContent, senderID);
        }

        try { if (api.setMessageReaction && mid) api.setMessageReaction("✅", mid); } catch(e) {}

    } catch (error) {
        console.error("AI Error:", error.message);
        api.sendMessage("❌ AI encountered an error.", senderID);
        try { if (api.setMessageReaction && mid) api.setMessageReaction("❌", mid); } catch(e) {}
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
