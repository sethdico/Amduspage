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
const axios = require('axios');
const FormData = require('form-data');

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const COOLDOWN_MS = 4000;
const lastRequests = new Map();

async function uploadBase64Attachment(senderId, data, pageAccessToken, reply) {
    const cleanBase64 = data.fileBase64.replace(/^data:.*;base64,/, '').replace(/\s/g, '');
    const mimeMatch = data.fileBase64.match(/^data:(.*?);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const fileName = data.fileName || 'file.bin';
    const buffer = Buffer.from(cleanBase64, 'base64');
    
    if (buffer.length > MAX_FILE_BYTES) throw new Error("File decoded size is too large.");

    const form = new FormData();
    form.append('recipient', JSON.stringify({ id: senderId }));
    form.append('message', JSON.stringify({ 
        attachment: { 
            type: mimeType.startsWith('image/') ? 'image' : 'file', 
            payload: {} 
        } 
    }));
    form.append('filedata', buffer, { 
        filename: fileName, 
        contentType: mimeType, 
        knownLength: buffer.length 
    });

    const messageBody = data.messageBody || '';
    if (messageBody) await reply(messageBody);

    await axios.post(
        `https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`, 
        form, 
        { 
            headers: form.getHeaders(), 
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        }
    );
}


module.exports.config = {
  name: "amdus",
  author: "sethdico",
  version: "21.0",
  category: "AI",
  description: "amdusai real time info and direct file generation.",
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
  const pageAccessToken = global.PAGE_ACCESS_TOKEN;

  const remaining = canSendNow(sender);
  if (remaining) return reply(`please wait ${remaining}s before your next request.`);

  const normalized = (prompt || "").toLowerCase().replace(/[^\w\s]/g, '').trim();
  const whoQueries = new Set(["who are you", "what are you", "who r u", "what r u"]);
  if (whoQueries.has(normalized)) {
    return reply("i am amdusbot by seth asher. type help for commands.");
  }

  const images = [
    ...(event.message?.attachments || []),
    ...(event.message?.reply_to?.attachments || [])
  ]
  .filter(a => a.type === "image")
  .map(a => a.payload.url);

  const url = images[0] || "";
  
  if (images.length > 0 && !prompt) return reply("You must send a query alongside your image(s).");
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
    
    const rawTxt = parseAI(res);
    if (!rawTxt) return reply("received empty response from ai.");
    
    // BASE64 JSON DETECTION (Prioritized)
    try {
        const fileJsonMatch = rawTxt.match(/\{"fileName":".*?","fileBase64":".*?"\}/s);
        if (fileJsonMatch) {
            const fileData = JSON.parse(fileJsonMatch[0]);
            
            const msgBody = rawTxt.substring(0, fileJsonMatch.index).trim();
            fileData.messageBody = msgBody;
            
            await uploadBase64Attachment(sender, fileData, pageAccessToken, reply);
            return; 
        }
    } catch (e) {
        console.error("Base64 processing error, falling back to original logic:", e.message);
    }
    
    // ORIGINAL URL DOWNLOAD LOGIC (Fallback)
    const fileRegex = /(https?:\/\/[^\s)]+\.(?:pdf|docx|xlsx|txt|jpg|jpeg|png|mp4|mp3|zip)(?:\?[^\s)]*)?)/i;
    const match = rawTxt.match(fileRegex);

    if (match) {
      const fileUrl = match[0];
      const msgBody = rawTxt.replace(match[0], "").trim();
      
      const fileName = path.basename(fileUrl).split("?")[0];
      const filePath = path.join(global.CACHE_PATH, fileName);

      try {
        if (!fs.existsSync(global.CACHE_PATH)) {
            fs.mkdirSync(global.CACHE_PATH);
        }

        const head = await http.head(fileUrl);
        const size = head.headers['content-length'];
        
        if (size > MAX_FILE_BYTES) {
            return reply(`${msgBody}\n\n(file too large to send) [link: ${fileUrl}]`);
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
      // Default text reply
      reply(rawTxt);
    }

  } catch (e) {
    console.error("amdus.run critical error:", e);
    reply("critical error: " + (e.message || "process failed"));
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, sender);
  }
};
