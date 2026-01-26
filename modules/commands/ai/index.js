const fs = require("fs");
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

async function uploadBase64Attachment({ senderId, data, pageAccessToken, reply }) {
    const cleanBase64 = data.fileBase64.replace(/^data:.*;base64,/, '').replace(/\s/g, '');
    const mimeMatch = data.fileBase64.match(/^data:(.*?);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const fileName = data.fileName || 'file.bin';
    const buffer = Buffer.from(cleanBase64, 'base64');
    
    if (buffer.length > MAX_FILE_BYTES) throw new Error("File too large.");

    const form = new FormData();
    form.append('recipient', JSON.stringify({ id: senderId }));
    form.append('message', JSON.stringify({ 
        attachment: { type: mimeType.startsWith('image/') ? 'image' : 'file', payload: {} } 
    }));
    form.append('filedata', buffer, { 
        filename: fileName, 
        contentType: mimeType, 
        knownLength: buffer.length 
    });

    if (data.messageBody) await reply(data.messageBody);

    await axios.post(
        `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`, 
        form, 
        { headers: form.getHeaders(), maxContentLength: Infinity, maxBodyLength: Infinity }
    );
}

module.exports.config = {
  name: "amdus",
  author: "sethdico",
  version: "36.0",
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

  const remaining = canSendNow(sender);
  if (remaining) return reply(`please wait ${remaining}s before your next request.`);

  const normalized = (prompt || "").toLowerCase().replace(/[^\w\s]/g, '').trim();
  const whoQueries = new Set(["who are you", "what are you", "who r u", "what r u"]);
  if (whoQueries.has(normalized)) return reply("i am amdusbot by seth asher. type help for commands.");

  const attachments = [
      ...(event.message?.attachments || []),
      ...(event.message?.reply_to?.attachments || [])
  ];
  
  const imageUrls = attachments
      .filter(a => a.type === "image")
      .map(a => a.payload.url);

  if (imageUrls.length > 0 && !prompt) return reply("Reply to the image and sent your query.");
  if (!prompt && imageUrls.length === 0) return reply("hello, i am amdusbot. how can i help you today?");

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, sender);

  try {
    const session = getSession(sender);
    
    let finalPrompt = prompt;
    if (imageUrls.length > 0) {
        const imageBlock = imageUrls.map(url => `[image: ${url}]`).join("\n");
        finalPrompt = `${imageBlock}\n\n${prompt}`;
    }

    const res = await askChipp(finalPrompt, null, session);

    if (!res || res.error) return reply(`⚠️ ${res?.message || "ai request failed"}`);
    
    if (res.data?.chatSessionId) saveSession(sender, res.data.chatSessionId);
    
    const rawTxt = parseAI(res);
    if (!rawTxt) return reply("received empty response from ai.");
    
    try {
        const fileJsonMatch = rawTxt.match(/\{"fileName":".*?","fileBase64":".*?"\}/s);
        if (fileJsonMatch) {
            const fileData = JSON.parse(fileJsonMatch[0]);
            fileData.messageBody = rawTxt.substring(0, fileJsonMatch.index).trim();
            
            await uploadBase64Attachment({ senderId: sender, data: fileData, pageAccessToken, reply });
            return; 
        }
    } catch (e) {}
    
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
                
                await uploadBase64Attachment({ 
                    senderId: sender, 
                    data: { 
                        fileName: json.fileName || fileName, 
                        fileBase64: json.fileBase64,
                        messageBody: msgBody 
                    }, 
                    pageAccessToken, 
                    reply 
                });
                return;
            }
        } catch (jsonErr) {}

        const type = mimeType.startsWith('image/') ? 'image' : (mimeType.startsWith('video/') ? 'video' : 'file');
        const form = new FormData();
        form.append('recipient', JSON.stringify({ id: sender }));
        form.append('message', JSON.stringify({ attachment: { type, payload: {} } }));
        form.append('filedata', buffer, { filename: fileName, contentType: mimeType, knownLength: buffer.length });

        if (msgBody) await reply(msgBody);

        await axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`, form, {
            headers: form.getHeaders(), maxContentLength: Infinity, maxBodyLength: Infinity
        });

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
