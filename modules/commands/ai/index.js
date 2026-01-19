const { askChipp } = require("./handlers");
const { getSession, saveSession } = require("./session");
const { parseAI, isPrivateHost } = require("../../utils/helpers");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const { http } = require("../../utils/http");
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

const allowed = ['.pdf', '.docx', '.xlsx', '.txt', '.jpg', '.jpeg', '.png', '.mp4', '.mp3', '.zip'];
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
const COOLDOWN_MS = 4000; // 4 seconds

// per-process per-user cooldown map (simple in-memory guard)
const lastRequests = new Map();

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

function canSendNow(userId) {
  const now = Date.now();
  const last = lastRequests.get(userId) || 0;
  if (now - last < COOLDOWN_MS) {
    return Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
  }
  lastRequests.set(userId, now);
  return 0;
}

module.exports.run = async function ({ event, args, api, reply }) {
  const sender = event.sender.id;
  const prompt = args.join(" ").trim();

  const remaining = canSendNow(sender);
  if (remaining) return reply(`wait ${remaining}s before the next AI ask `);

  const img1 = event.message?.attachments?.find(a => a.type === "image")?.payload?.url;
  const img2 = event.message?.reply_to?.attachments?.find(a => a.type === "image")?.payload?.url;
  const url = img1 || img2 || "";
  if (img1 && !prompt) return reply("reply with what you want me to do with the image");
  if (!prompt && !url) return reply("hi, i'm amdusbot. what's up?");
  if (api.sendTypingIndicator) api.sendTypingIndicator(true, sender);

  try {
    const session = getSession(sender);
    const data = await askChipp(prompt, url, session);

    if (!data || data.error) {
      const msg = data?.message || "no response from ai";
      console.error("ai error:", data?.error || msg);
      return reply(`⚠️ ${msg}`);
    }

    if (data.chatSessionId) saveSession(sender, data.chatSessionId);
    const txt = parseAI({ data });

    if (!txt) {
      if (api.sendTypingIndicator) api.sendTypingIndicator(false, sender);
      return reply("no response from ai");
    }

    // detect file URL inside response
    const fileRegex = /(https?:\/\/[^\s)]+\.(?:pdf|docx|xlsx|txt|jpg|jpeg|png|mp4|mp3|zip)(?:\?[^\s)]*)?)/i;
    const match = txt.match(fileRegex);

    if (match) {
      const fileUrl = match[0];
      const msgBody = txt.replace(match[0], "").trim();
      if (msgBody) await reply(msgBody);

      // block private hosts (SSRF protection)
      const isPrivate = await isPrivateHost(fileUrl);
      if (isPrivate) {
        console.warn("blocked private host download:", fileUrl);
        return reply("can't fetch files from private/internal hosts");
      }

      // check HEAD to get content-length and basic headers
      let head;
      try {
        head = await http.head(fileUrl);
      } catch (e) {
        console.error("HEAD failed for", fileUrl, e.message);
        return reply("couldn't fetch file info, sorry");
      }

      const len = parseInt(head.headers['content-length'] || '0', 10);
      if (len && len > MAX_FILE_BYTES) {
        return reply("that file is too big (max 25MB)");
      }

      const ext = path.extname(fileUrl.split('?')[0]) || '.bin';
      if (!allowed.includes(ext.toLowerCase())) return reply("invalid file type");

      const fname = `file_${Date.now()}${ext}`;
      const fpath = path.join(global.CACHE_PATH, fname);
      const writer = fs.createWriteStream(fpath);

      try {
        const res = await http.get(fileUrl, { responseType: 'stream' });

        const respLen = parseInt(res.headers?.['content-length'] || '0', 10);
        if (respLen && respLen > MAX_FILE_BYTES) {
          return reply("that file is too big (max 25MB)");
        }

        // stream to disk
        await streamPipeline(res.data, writer);

        const type = fname.match(/\.(jpg|png|jpeg)$/i) ? "image" : "file";
        await api.sendAttachment(type, fpath, sender);

        // delete after send; try best-effort cleanup
        setTimeout(() => fsPromises.unlink(fpath).catch(()=>{}), 10000);
      } catch (e) {
        console.error("file download/send failed:", e.message);
        try { writer.destroy(); } catch(_){}
        try { await fsPromises.unlink(fpath).catch(()=>{}); } catch(_){}
        return reply("error fetching the file, sry :(");
      }
    } else {
      reply(txt);
    }
  } catch (e) {
    console.error("ai.run error:", e);
    reply("error: " + (e.message || "something went wrong"));
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, sender);
  }
};
