const { askChipp } = require("./handlers");
const { getSession, saveSession } = require("./session");
const { parseAI } = require("../../utils/helpers");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const { http } = require("../../utils/http");

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_TYPES = ['.pdf', '.docx', '.xlsx', '.txt', '.jpg', '.jpeg', '.png', '.mp4', '.mp3', '.zip'];

module.exports.config = {
  name: "ai", 
  author: "Sethdico", 
  version: "18.0", 
  category: "AI", 
  description: "Advanced Assistant.", 
  adminOnly: false, 
  usePrefix: false, 
  cooldown: 0, 
};

module.exports.run = async function ({ event, args, api, reply }) {
  const senderID = event.sender.id;
  const userPrompt = args.join(" ").trim();

  const currentImg = event.message?.attachments?.find(a => a.type === "image")?.payload?.url;
  const repliedImg = event.message?.reply_to?.attachments?.find(a => a.type === "image")?.payload?.url;
  const imageUrl = currentImg || repliedImg || "";

  if (currentImg && !userPrompt) return reply("🖼️ I see your image! Reply to it with instructions.");
  if (!userPrompt && !imageUrl) return reply("hi. i'm amdusbot. how can i help?");

  try {
    const sessionData = getSession(senderID);
    const data = await askChipp(userPrompt, imageUrl, sessionData);

    if (data.chatSessionId) saveSession(senderID, data.chatSessionId);
    
    const replyContent = parseAI({ data }); 
    const fileRegex = /(https?:\/\/[^\s)]+\.(?:pdf|docx|xlsx|txt|jpg|jpeg|png|mp4|mp3|zip)(?:\?[^\s)]*)?)/i;
    const match = replyContent?.match(fileRegex);

    if (match) {
      const fileUrl = match[0];
      const textOnly = replyContent.replace(match[0], "").trim();
      if (textOnly) await reply(textOnly);
      
      const fileName = `file_${Date.now()}${path.extname(fileUrl.split('?')[0]) || '.bin'}`;
      if (!ALLOWED_TYPES.includes(path.extname(fileName).toLowerCase())) return reply("⚠️ file type not allowed");

      const filePath = path.join(global.CACHE_PATH, fileName);
      const writer = fs.createWriteStream(filePath);
      const fileRes = await http.get(fileUrl, { responseType: 'stream', maxContentLength: MAX_FILE_SIZE });
      
      fileRes.data.pipe(writer);
      await new Promise((res) => writer.on('finish', res));
      await api.sendAttachment(fileName.match(/\.(jpg|png|jpeg)$/i) ? "image" : "file", filePath, senderID);
      
      setTimeout(() => fsPromises.unlink(filePath).catch(()=>{}), 10000);
    } else {
      reply(replyContent || "❌ No response.");
    }
  } catch (error) {
    if (error.code === 'ECONNABORTED') reply("request timed out");
    else reply("something went wrong: " + error.message);
  }
};
