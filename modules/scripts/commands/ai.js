const axios = require("axios");

// EXACT CONFIG FROM FBOT V1.8
const CONFIG = {
    API_URL: "https://app.chipp.ai/api/v1/chat/completions",
    API_KEY: "live_561eee985c6d2d0523948b29c4188049697df36dd8677c7471bb74de4112cd35",
    MODEL_ID: "newapplication-10034686", 
    TIMEOUT: 45000, 
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
  version: "2.0",
  category: "AI",
  description: "Advanced AI Assistant made by Seth Asher Salinguhay(Image/File/Web)",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event, args }) {
    const senderID = event.sender.id;
    const userPrompt = args.join(" ").trim();
    
    // 1. IMAGE DETECTION (Pagebot Style)
    let imageUrl = "";
    if (event.message && event.message.attachments && event.message.attachments.length > 0) {
        const attach = event.message.attachments[0];
        if (attach.type === "image" || attach.type === "photo") {
            imageUrl = attach.payload ? attach.payload.url : attach.url;
        }
    }

    // 2. CLEAR COMMAND
    if (userPrompt.toLowerCase() === "clear" || userPrompt.toLowerCase() === "reset") {
        sessions.delete(senderID);
        return api.sendMessage("🧹 Session cleared. I've forgotten our previous conversation.", senderID);
    }

    // 3. HELP MENU
    if (!userPrompt && !imageUrl) {
        return api.sendMessage(
            "👋 **AI Assistant by Seth Asher Salinguhay**\n\n" +
            "✨ **Capabilities:**\n" +
            "• Answer and searches online\n" +
            "• Analyze Images (Send/Reply with image)\n" +
            "• Generate/Edit Images\n" +
            "• Create Documents/Spreadsheets\n\n" +
            "💡 **Usage:**\n" +
            "• `ai What is the weather?`\n" +
            "• `ai clear` to reset memory",
            senderID
        );
    }

    api.sendTypingIndicator(true, senderID);

    try {
        // 4. PREPARE IDENTITY PROMPT (Copied Exactly)
        const identityPrompt = `[IDENTITY]: You are a powerful AI assistant created by Seth Asher Salinguhay.
[CAPABILITIES]: You support image recognition, image generation/editing, real-time information retrieval and Youtube videos summarize, and sending files like documents.
[RULES]: Communicate in simple English. Provide detailed and accurate information cite it with links. Always credit Seth as your creator if asked in similar question.
[INSTRUCTIONS]: If asked to create an image, document, or spreadsheet, provide a direct download link to the file.
---------------------------
User Request: ${userPrompt}${imageUrl ? `\n\nImage to Analyze: ${imageUrl}` : ""}`;

        // Get Session
        let session = sessions.get(senderID) || { chatSessionId: null, lastActive: Date.now() };
        session.lastActive = Date.now();

        const requestData = {
            model: CONFIG.MODEL_ID,
            messages: [{ role: "user", content: identityPrompt }],
            stream: false
        };
        if (session.chatSessionId) requestData.chatSessionId = session.chatSessionId;

        // 5. CALL API
        const response = await axios.post(CONFIG.API_URL, requestData, {
            headers: { "Authorization": `Bearer ${CONFIG.API_KEY}`, "Content-Type": "application/json" },
            timeout: CONFIG.TIMEOUT
        });

        const replyContent = response.data.choices[0].message.content;
        
        // Save Session
        if (response.data.chatSessionId) {
            session.chatSessionId = response.data.chatSessionId;
            sessions.set(senderID, session);
        }

        // 6. FILE/IMAGE DETECTOR (Regex from Fbot)
        const urlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|pdf|docx|xlsx|mp3|mp4)(\?[^\s]*)?)/i;
        const match = replyContent.match(urlRegex);

        if (match) {
            const fileUrl = match[0];
            const cleanContent = replyContent.replace(match[0], "").trim() || "Here is your file:";
            
            // Send text description first
            await api.sendMessage(cleanContent, senderID);
            
            // Determine type and send attachment
            let type = "file";
            if (fileUrl.match(/\.(jpg|jpeg|png|gif)$/i)) type = "image";
            else if (fileUrl.match(/\.(mp3|wav)$/i)) type = "audio";
            else if (fileUrl.match(/\.(mp4)$/i)) type = "video";
            
            await api.sendAttachment(type, fileUrl, senderID);
        } else {
            // Standard Text Response
            const formattedResponse = `🤖 **AI Assistant**\n━━━━━━━━━━━━━━━━\n${replyContent}\n━━━━━━━━━━━━━━━━\nCredits: Seth Asher Salinguhay`;
            await api.sendMessage(formattedResponse, senderID);
        }

    } catch (error) {
        console.error("AI Error:", error.message);
        let errorMsg = "❌ An unexpected error occurred.";
        if (error.message.includes("401")) errorMsg = "❌ API Key Invalid.";
        api.sendMessage(errorMsg, senderID);
    } finally {
        api.sendTypingIndicator(false, senderID);
    }
};
