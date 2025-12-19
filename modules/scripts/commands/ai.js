const axios = require("axios");

// ==============================================================================
// CONFIGURATION
// ==============================================================================
const CONFIG = {
    API_URL: "https://app.chipp.ai/api/v1/chat/completions",
    API_KEY: "live_561eee985c6d2d0523948b29c4188049697df36dd8677c7471bb74de4112cd35", // YOUR KEY
    MODEL_ID: "newapplication-10034686", 
    TIMEOUT: 60000, // 60 seconds
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
};

// ==============================================================================
// MEMORY STORAGE (Sessions)
// ==============================================================================
const sessions = new Map();

// Garbage Collection (Runs every 5 minutes to clean old memories)
setInterval(() => {
    const now = Date.now();
    sessions.forEach((session, userId) => {
        if (now - session.lastActive > CONFIG.SESSION_TIMEOUT) {
            sessions.delete(userId);
        }
    });
}, 300000);

module.exports.config = {
  name: "ai",
  author: "Sethdico (Ported)",
  version: "2.0",
  category: "AI",
  description: "Advanced AI with Image Analysis & Memory",
  adminOnly: false,
  usePrefix: false, // WORKS WITHOUT PREFIX
  cooldown: 5,
};

module.exports.run = async function ({ event, args }) {
    const senderID = event.sender.id;
    // Pagebot stores attachments in event.message.attachments
    const attachments = event.message ? event.message.attachments : [];
    const userPrompt = args.join(" ").trim();
    
    // 1. COMMANDS: CLEAR MEMORY
    if (userPrompt.toLowerCase() === "clear" || userPrompt.toLowerCase() === "reset") {
        sessions.delete(senderID);
        return api.sendMessage("🧹 Memory cleared. I've forgotten our previous conversation.", senderID);
    }

    // 2. CHECK FOR IMAGES (Current message)
    let imageUrl = "";
    if (attachments && attachments.length > 0) {
        // Find the first photo attachment
        const photo = attachments.find(a => a.type === "image" || a.type === "photo");
        if (photo) {
            // Pagebot structure usually puts URL in payload.url
            imageUrl = photo.payload ? photo.payload.url : photo.url;
        }
    }

    // 3. HELP MESSAGE
    if (!userPrompt && !imageUrl) {
        return api.sendMessage(
            "👋 **AI Assistant**\n\n" +
            "✨ **Capabilities:**\n" +
            "• Chat & Search Online\n" +
            "• Analyze Images (Send/Reply with image)\n" +
            "• Remember Context\n\n" +
            "💡 **Usage:**\n" +
            "• `ai What is the weather?`\n" +
            "• `ai clear` (Reset memory)",
            senderID
        );
    }

    // 4. EXECUTION
    try {
        // Reaction: Thinking
        if (api.setMessageReaction) api.setMessageReaction("🧠", event.message.mid);
        
        // Typing Indicator
        if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

        // Get Session
        let session = sessions.get(senderID) || { chatSessionId: null, lastActive: Date.now() };
        session.lastActive = Date.now();

        // Prepare Prompt
        const identityPrompt = `[IDENTITY]: You are a powerful AI assistant running on Pagebot.
[CAPABILITIES]: You support image recognition, code generation, and general chat.
[RULES]: Communicate in simple English. Provide detailed and accurate information.
[INSTRUCTIONS]: If asked to create an image or file, explain that you can provide text descriptions or links if available.
---------------------------
User Request: ${userPrompt}${imageUrl ? `\n\n[IMAGE DETECTED]: Analyze this image: ${imageUrl}` : ""}`;

        // Construct Request
        const requestData = {
            model: CONFIG.MODEL_ID,
            messages: [{ role: "user", content: identityPrompt }],
            stream: false
        };

        if (session.chatSessionId) {
            requestData.chatSessionId = session.chatSessionId;
        }

        // Call Chipp AI
        const response = await axios.post(CONFIG.API_URL, requestData, {
            headers: {
                "Authorization": `Bearer ${CONFIG.API_KEY}`,
                "Content-Type": "application/json"
            },
            timeout: CONFIG.TIMEOUT
        });

        // Extract Response
        if (!response.data?.choices?.[0]?.message?.content) {
            throw new Error("Empty AI response received");
        }

        const replyContent = response.data.choices[0].message.content;
        
        // Save Session ID for memory
        if (response.data.chatSessionId) {
            session.chatSessionId = response.data.chatSessionId;
            sessions.set(senderID, session);
        }

        // Stop Typing
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);

        // 5. HANDLE FILE/IMAGE LINKS IN RESPONSE
        // Checks if the AI generated a URL (like an image link)
        const urlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|pdf|docx|xlsx|mp3|mp4)(\?[^\s]*)?)/i;
        const match = replyContent.match(urlRegex);

        if (match) {
            const fileUrl = match[0];
            const cleanText = replyContent.replace(match[0], "").trim();
            
            // Send text first
            if (cleanText) await api.sendMessage(cleanText, senderID);
            
            // Send the file
            // Determine type based on extension
            let type = "file";
            if (fileUrl.match(/\.(jpg|jpeg|png|gif)$/i)) type = "image";
            else if (fileUrl.match(/\.(mp3|wav)$/i)) type = "audio";
            else if (fileUrl.match(/\.(mp4)$/i)) type = "video";
            
            await api.sendAttachment(type, fileUrl, senderID);
        } else {
            // Normal Text Response
            const formattedResponse = `🤖 **AI Assistant**\n━━━━━━━━━━━━━━━━\n${replyContent}`;
            await api.sendMessage(formattedResponse, senderID);
        }

        // Reaction: Success
        if (api.setMessageReaction) api.setMessageReaction("✅", event.message.mid);

    } catch (error) {
        console.error("AI Error:", error.message);
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
        if (api.setMessageReaction) api.setMessageReaction("❌", event.message.mid);
        
        let errorMsg = "❌ An unexpected error occurred.";
        if (error.message.includes("401")) errorMsg = "❌ API Key Invalid.";
        else if (error.message.includes("429")) errorMsg = "⏳ Service is busy. Try again later.";
        
        api.sendMessage(errorMsg, senderID);
    }
};
