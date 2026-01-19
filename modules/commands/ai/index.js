const { askChipp } = require("./handlers");
const { getSession, saveSession } = require("./session");
const { parseAI } = require("../../utils/helpers");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const { http } = require("../../utils/http");
const allowed = ['.pdf', '.docx', '.xlsx', '.txt', '.jpg', '.jpeg', '.png', '.mp4', '.mp3', '.zip'];

module.exports.config = {
  name: "ai",
  author: "sethdico",
  version: "18.4",
  category: "AI",
  description: "advanced assistant",
  adminOnly: false,
  usePrefix: false,
  cooldown: 0,
};

module.exports.run = async function ({ event, args, api, reply }) {
  const sender = event.sender.id;
  const prompt = args.join(" ").trim();
  const img1 = event.message?.attachments?.find(a => a.type === "image")?.payload?.url;
  const img2 = event.message?.reply_to?.attachments?.find(a => a.type === "image")?.payload?.url;
  const url = img1 || img2 || "";
  if (img1 && !prompt) return reply("reply with what you want me to do with the image");
  if (!prompt && !url) return reply("hi, i'm amdusbot. how can i help?");
  if (api.sendTypingIndicator) api.sendTypingIndicator(true, sender);
  try {
    const session = getSession(sender);
    const data = await askChipp(prompt, url, session);
    if (data.chatSessionId) saveSession(sender, data.chatSessionId);
    const txt = parseAI({ data });
    if (!txt) {
      if (api.sendTypingIndicator) api.sendTypingIndicator(false, sender);
      return reply("no response from ai");
    }
    const fileRegex = /(https?:\/\/[^\s)]+\.(?:pdf|docx|xlsx|txt|jpg|jpeg|png|mp4|mp3|zip)(?:\?[^\s)]*)?)/i;
    const match = txt.match(fileRegex);
    if (match) {
      const fileUrl = match[0];
      const msgBody = txt.replace(match[0], "").trim();
      if (msgBody) await reply(msgBody);
      const ext = path.extname(fileUrl.split('?')[0]) || '.bin';
      if (!allowed.includes(ext.toLowerCase())) return reply("invalid file type");
      const fname = `file_${Date.now()}${ext}`;
      const fpath = path.join(global.CACHE_PATH, fname);
      const writer = fs.createWriteStream(fpath);
      const res = await http.get(fileUrl, { responseType: 'stream', maxContentLength: 26214400 });
      res.data.pipe(writer);
      await new Promise(r => writer.on('finish', r));
      const type = fname.match(/\.(jpg|png|jpeg)$/i) ? "image" : "file";
      await api.sendAttachment(type, fpath, sender);
      setTimeout(() => fsPromises.unlink(fpath).catch(()=>{}), 10000);
    } else {
      reply(txt);
    }
  } catch (e) {
    reply("error: " + e.message);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, sender);
  }
};
