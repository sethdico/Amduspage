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
  name: "ai", author: "Sethdico", version: "16.55-ChippSync", category: "AI", description: "Advanced AI.", adminOnly: false, usePrefix: false, cooldown: 0, 
};

module.exports.run = async function ({ event, args, api, reply }) {
  const senderID = event.sender.id;
  const userPrompt = args.join(" ").trim();
  const apiKey = process.env.CHIPP_API_KEY;

  if (!apiKey) return reply("❌ chipp_api_key missing on render.");

  let imageUrl = event.message?.attachments?.[0]?.payload?.url || event.message?.reply_to?.attachments?.[0]?.payload?.url || "";

  if (imageUrl && !userPrompt && event.message?.attachments) return reply("🖼️ I see the image. Reply to it and type your instructions.");
  if (!userPrompt && !imageUrl) return reply("👋 hi. i'm amdusbot. i can search, see images, and write files.");

  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  if (userPrompt && youtubeRegex.test(userPrompt)) await sendYouTubeThumbnail(userPrompt, senderID, api);

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    const identityPrompt = `[SYSTEM]: Amdusbot. Helpful wise ai. Uses CoVe and ToT logic. No reasoning in output. Creator: Seth Asher Salinguhay.`;
    let sessionData = (global.sessions || (global.sessions = new Map())).get(senderID) || { chatSessionId: null };

    const response = await fetchWithRetry(async () => {
        // MATCHING THE DOCUMENTATION BODY
        const body = {
          model: "newapplication-10035084",
          messages: [
              { role: "system", content: identityPrompt },
              { role: "user", content: `Input: ${userPrompt}\n${imageUrl ? `[ATTACHED IMAGE]: ${imageUrl}` : ""}` }
          ],
          stream: false
        };

        // MATCHING THE DOCUMENTATION SESSION LOGIC
        if (sessionData.chatSessionId) body.chatSessionId = sessionData.chatSessionId;

        // MATCHING THE DOCUMENTATION HEADERS
        return http.post("https://app.chipp.ai/api/v1/chat/completions", body, { 
            headers: { 
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            } 
        });
    });

    if (response.data.chatSessionId) {
        if (!global.sessions) global.sessions = new Map();
        global.sessions.set(senderID, { chatSessionId: response.data.chatSessionId });
    }

    const replyContent = parseAI(response);

    if (!replyContent) throw new Error("Blank response from Chipp");

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

      await new Promise((res) => writer.on('finish', res));
      await api.sendAttachment(fileName.match(/\.(jpg|png|jpeg)$/i) ? "image" : "file", filePath, senderID);
      setTimeout(async () => { try { await fsPromises.unlink(filePath); } catch(e) {} }, 10000);
    } else {
      await reply(replyContent);
    }
  } catch (error) {
    const errMsg = error.response?.data?.error || error.message;
    console.error("Chipp Error:", errMsg);
    reply(`❌ AI Error: ${typeof errMsg === 'string' ? errMsg : 'Request failed.'}`);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
