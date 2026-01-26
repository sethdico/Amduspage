const { askChipp } = require("./handlers");
const { getSession, saveSession } = require("./session");
const { parseAI } = require("../../utils/helpers");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const { http } = require("../../utils/http");
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

const allowed = ['.pdf', '.docx', '.xlsx', '.txt', '.jpg', '.jpeg', '.png', '.mp4', '.mp3', '.zip'];
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const COOLDOWN_MS = 4000;

const lastRequests = new Map();

module.exports.config = {
  name: "amdus",
  author: "sethdico",
  version: "19.0",
  category: "AI",
  description: "amdusai real time info, image recognition/generation, file generation.",
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
  if (remaining) return reply(`please wait ${remaining}s before your next request.`);

  const normalized = (prompt || "").toLowerCase().replace(/[^\w\s]/g, '').trim();
  const whoQueries = new Set(["who are you", "what are you", "who r u", "what r u"]);
  if (whoQueries.has(normalized)) {
    return reply("i am amdusbot by seth asher. type help for commands.");
  }

  const img1 = event.message?.attachments?.find(a => a.type === "image")?.payload?.url;
  const img2 = event.message?.reply_to?.attachments?.find(a => a.type === "image")?.payload?.url;
  const url = img1 || img2 || "";

  if (img1 && !prompt) return reply("Reply to the image alongside with your instruction.");
  if (!prompt && !url) return reply("hello, i am amdusbot. how can i help you today?");

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, sender);

  try {
    const session = getSession(sender);
    const res = await askChipp(prompt, url, session);

    if (!res || res.error) {
      const msg = res?.message || "no response from ai";
      console.error("ai error:", res?.error || msg);
      return reply(`⚠️ ${msg}`);
    }

    if (res.data?.chatSessionId) saveSession(sender, res.data.chatSessionId);
    
    const txt = parseAI(res);
    if (!txt) {
      if (api.sendTypingIndicator) api.sendTypingIndicator(false, sender);
      return reply("received empty response from ai.");
    }

    const fileRegex = /(https?:\/\/[^\s)]+\.(?:pdf|docx|xlsx|txt|jpg|jpeg|png|mp4|mp3|zip)(?:\?[^\s)]*)?)/i;
    const match = txt.match(fileRegex);

    if (match) {
      const fileUrl = match[0];
      const msgBody = txt.replace(match[0], "").trim();
      
      const fileName = path.basename(fileUrl).split("?")[0];
      const filePath = path.join(__dirname, "cache", fileName);

      try {
        if (!fs.existsSync(path.join(__dirname, "cache"))) {
            fs.mkdirSync(path.join(__dirname, "cache"));
        }

        const head = await http.head(fileUrl);
        const size = head.headers['content-length'];
        
        if (size > MAX_FILE_BYTES) {
            return reply(`${msgBody}\n\n(file too large to send)`);
        }

        const response = await http.get(fileUrl, { responseType: 'stream' });
        await streamPipeline(response.data, fs.createWriteStream(filePath));

        await reply({
            body: msgBody,
            attachment: fs.createReadStream(filePath)
        });

        await fsPromises.unlink(filePath);
      } catch (err) {
        console.error("file download error:", err);
        reply(`${msgBody}\n\n[link: ${fileUrl}]`);
      }
    } else {
      reply(txt);
    }

  } catch (e) {
    console.error("ai.run error:", e);
    reply("critical error: " + (e.message || "process failed"));
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, sender);
  }
};
