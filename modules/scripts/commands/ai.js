const { http, fetchWithRetry, parseAI } = require("../../utils");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");

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
  version: "17.71", 
  category: "AI", 
  description: "Advanced Assistant.", 
  adminOnly: false, 
  usePrefix: false, 
  cooldown: 0, 
};

module.exports.run = async function ({ event, args, api, reply }) {
  const senderID = event.sender.id;
  const userPrompt = args.join(" ").trim();
  const apiKey = process.env.CHIPP_API_KEY;

  if (global.sessions.size > 100) global.sessions.delete(global.sessions.keys().next().value);

  // Get image from current message or replied message
  const currentImg = event.message?.attachments?.find(a => a.type === "image")?.payload?.url;
  const repliedImg = event.message?.reply_to?.attachments?.find(a => a.type === "image")?.payload?.url;
  const imageUrl = currentImg || repliedImg || "";

  // DEBUG: Log what we're receiving
  console.log("🔍 AI Debug - Current attachments:", event.message?.attachments);
  console.log("🔍 AI Debug - Reply attachments:", event.message?.reply_to?.attachments);
  console.log("🔍 AI Debug - Image URL found:", imageUrl);

  // If user sends JUST an image (no text), prompt them to reply with instructions
  if (currentImg && !userPrompt) {
    return reply("🖼️ I see your image! Reply to it with your instructions.\n\nExamples:\n• 'describe this'\n• 'what's in this image?'\n• 'identify the object'");
  }
  
  // If replying to an image but forgot to add text
  if (repliedImg && !userPrompt) {
    return reply("📝 Please add your instruction! Tell me what you want to know about the image.");
  }
  
  if (!userPrompt && !imageUrl) {
    return reply("hi. i'm amdusbot. how can i help?");
  }

  if (userPrompt.toLowerCase().includes("youtube.com")) {
    await sendYouTubeThumbnail(userPrompt, senderID, api);
  }

  try {
    const identityPrompt = `[SYSTEM]: You are Amdusbot, a helpful and wise AI assistant created by Seth Asher Salinguhay. You use chain-of-thought reasoning (CoT) and tree-of-thoughts (ToT) internally but only send the final answer without showing the reasoning process. If you're not sure about something, admit it rather than guess or hallucinate. Ensure everything is accurate. Response limit: 2000 characters.`;
    
    let sessionData = global.sessions.get(senderID) || { chatSessionId: null };

    const response = await fetchWithRetry(async () => {
        // FIXED: Build the message properly based on what's available
        let userMessage = "";
        
        // Add image reference if present
        if (imageUrl) {
          userMessage += `[Image URL: ${imageUrl}]\n\n`;
        }
        
        // Add user's text input
        if (userPrompt) {
          userMessage += userPrompt;
        } else if (imageUrl) {
          userMessage += "Describe this image in detail.";
        }

        return http.post("https://app.chipp.ai/api/v1/chat/completions", {
          model: "newapplication-10035084",
          messages: [
            { role: "system", content: identityPrompt },
            { role: "user", content: userMessage }
          ],
          chatSessionId: sessionData.chatSessionId,
          stream: false
        }, { 
          headers: { 
            "Authorization": `Bearer ${apiKey}`, 
            "Content-Type": "application/json" 
          } 
        });
    });

    if (response.data.chatSessionId) {
      global.sessions.set(senderID, { chatSessionId: response.data.chatSessionId });
    }
    
    const replyContent = parseAI(response);

    // Handle file attachments in response
    const fileRegex = /(https?:\/\/[^\s)]+\.(?:pdf|docx|xlsx|txt|jpg|jpeg|png|mp4|mp3|zip)(?:\?[^\s)]*)?)/i;
    const match = replyContent?.match(fileRegex);

    if (match) {
      const fileUrl = match[0];
      const textOnly = replyContent.replace(match[0], "").trim();
      
      if (textOnly) await reply(textOnly);
      
      const fileName = `file_${Date.now()}${path.extname(fileUrl.split('?')[0]) || '.bin'}`;
      const filePath = path.join(global.CACHE_PATH, fileName);
      const writer = fs.createWriteStream(filePath);
      const fileRes = await http.get(fileUrl, { responseType: 'stream' });
      fileRes.data.pipe(writer);
      
      await new Promise((res) => writer.on('finish', res));
      await api.sendAttachment(
        fileName.match(/\.(jpg|png|jpeg)$/i) ? "image" : "file", 
        filePath, 
        senderID
      );
      
      setTimeout(async () => { 
        try { await fsPromises.unlink(filePath); } catch(e) {} 
      }, 10000);
    } else {
      reply(replyContent || "❌ No response.");
    }
    
  } catch (error) {
    console.error("AI Error:", error.message);
    reply("❌ AI glitch.");
  }
};
