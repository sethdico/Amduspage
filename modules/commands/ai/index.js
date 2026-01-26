const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const { http } = require("../../utils/http");
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);
const axios = require('axios');
const FormData = require('form-data');

const { askChipp } = require("./handlers");
const { getSession, saveSession } = require("./session");
const { parseAI } = require("../../utils/helpers");

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const COOLDOWN_MS = 4000;
const lastRequests = new Map();

async function sendRawAttachment(senderId, buffer, fileName, mimeType, messageBody, pageAccessToken, reply) {
    if (buffer.length > MAX_FILE_BYTES) throw new Error("File too large.");

    const type = (mimeType.startsWith('image/') ? 'image' : (mimeType.startsWith('video/') ? 'video' : 'file'));

    const form = new FormData();
    form.append('recipient', JSON.stringify({ id: senderId }));
    form.append('message', JSON.stringify({ 
        attachment: { type: type, payload: {} } 
    }));
    form.append('filedata', buffer, { 
        filename: fileName, 
        contentType: mimeType, 
        knownLength: buffer.length 
    });

    if (messageBody) await reply(messageBody);

    await axios.post(
        `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`, 
        form, 
        { headers: form.getHeaders(), maxContentLength: Infinity, maxBodyLength: Infinity }
    );
}

module.exports.config = {
  name: "amdus",
  author: "sethdico",
  version: "30.0",
  category: "AI",
  description: "real time info, multi-image vision, generation, and file output.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 0,
};

function canSendNow(userId) {
  const now = Date.now();
  const last = lastRequests.get(userId) || 0;
  if (now - last < COOLDOWN_MS) return Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
  lastRequests.set(userId, now);
  return 0;
}

module.exports.run = async function ({ event, args, api, reply }) {
  const sender = event.sender.id;
  const prompt = args.join(" ").trim();
  const pageAccessToken = global.PAGE_ACCESS_TOKEN;
  const { CHIPP_API_KEY, CHIPP_MODEL } = process.env;

  const remaining = canSendNow(sender);
  if (remaining) return reply(`please wait ${remaining}s before your next request.`);

  const normalized = (prompt || "").toLowerCase().replace(/[^\w\s]/g, '').trim();
  const whoQueries = new Set(["who are you", "what are you", "who r u", "what r u"]);
  if (whoQueries.has(normalized)) return reply("i am amdusbot by seth asher. type help for commands.");

  const getMediaUrls = () => {
      const current = event.message?.attachments || [];
      const replied = event.message?.reply_to?.attachments || [];
      return [...current, ...replied]
          .filter(a => ["image", "video"].includes(a.type))
          .map(a => a.payload.url);
  };

  const mediaUrls = getMediaUrls();

  if (mediaUrls.length > 0 && !prompt) return reply("You MUST send a query alongside your image(s).");
  if (!prompt && mediaUrls.length === 0) return reply("hello, i am amdusbot. how can i help you today?");

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, sender);

  try {
    const session = getSession(sender);
    
    let contentPayload = [];
    if (prompt) contentPayload.push({ type: "text", text: prompt });
    else contentPayload.push({ type: "text", text: "Describe this image." });

    mediaUrls.forEach(url => {
        contentPayload.push({ type: "image_url", image_url: { url: url } });
    });

    const body = {
        model: CHIPP_MODEL || "newapplication-10035084",
        messages: [
            { role: "system", content: "You are AmdusBot. Helpful, direct, and capable of analyzing images." },
            { role: "user", content: contentPayload }
        ],
        chatSessionId: session?.chatSessionId,
        stream: false,
        temperature: 0.5
    };

    const res = await http.post("https://app.chipp.ai/api/v1/chat/completions", body, {
      headers: {
        "Authorization": `Bearer ${CHIPP_API_KEY}`,
        "Content-Type": "application/json"
      },
      timeout: 60000
    });

    if (!res.data || res.data.error) return reply(`⚠️ ${res.data?.error || "ai request failed"}`);
    
    if (res.data?.chatSessionId) saveSession(sender, res.data.chatSessionId);
    
    const rawTxt = parseAI({ data: res.data });
    if (!rawTxt) return reply("received empty response from ai.");
    
    try {
        const fileJsonMatch = rawTxt.match(/\{"fileName":".*?","fileBase64":".*?"\}/s);
        if (fileJsonMatch) {
            const fileData = JSON.parse(fileJsonMatch[0]);
            const msgBody = rawTxt.substring(0, fileJsonMatch.index).trim();
            
            const cleanBase64 = fileData.fileBase64.replace(/^data:.*;base64,/, '').replace(/\s/g, '');
            const buffer = Buffer.from(cleanBase64, 'base64');
            const mimeMatch = fileData.fileBase64.match(/^data:(.*?);base64,/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';

            await sendRawAttachment(sender, buffer, fileData.fileName || 'file.bin', mimeType, msgBody, pageAccessToken, reply);
            return; 
        }
    } catch (e) {
        console.error("Direct JSON parse error:", e.message);
    }
    
    const fileRegex = /(https?:\/\/[^\s)]+\.(?:pdf|docx|xlsx|txt|jpg|jpeg|png|mp4|mp3|zip|bin)(?:\?[^\s)]*)?)/i;
    const match = rawTxt.match(fileRegex) || (rawTxt.includes("chipp.ai/api/downloads") ? rawTxt.match(/(https?:\/\/[^\s)]+)/) : null);

    if (match) {
      const fileUrl = match[0];
      const msgBody = rawTxt.replace(match[0], "").trim();
      
      try {
        const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        
        let fileName = path.basename(fileUrl.split("?")[0]) || "downloaded_file.bin";
        let mimeType = response.headers['content-type'] || 'application/octet-stream';

        try {
            const textContent = buffer.toString('utf8');
            if (textContent.includes('"fileBase64":') && textContent.includes('"fileName":')) {
                const json = JSON.parse(textContent);
                const cleanBase64 = json.fileBase64.replace(/^data:.*;base64,/, '').replace(/\s/g, '');
                
                const realBuffer = Buffer.from(cleanBase64, 'base64');
                const realMimeMatch = json.fileBase64.match(/^data:(.*?);base64,/);
                
                await sendRawAttachment(
                    sender, 
                    realBuffer, 
                    json.fileName || fileName, 
                    realMimeMatch ? realMimeMatch[1] : mimeType, 
                    msgBody, 
                    pageAccessToken, 
                    reply
                );
                return;
            }
        } catch (jsonErr) {}

        await sendRawAttachment(sender, buffer, fileName, mimeType, msgBody, pageAccessToken, reply);

      } catch (err) {
        reply(`${msgBody}\n\n[link: ${fileUrl}]`);
      }
    } else {
      reply(rawTxt);
    }

  } catch (e) {
    console.error("amdus critical error:", e);
    reply("critical error: process failed");
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, sender);
  }
};
