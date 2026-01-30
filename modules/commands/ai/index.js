const fs = require("fs");
const path = require("path");
const axios = require('axios');
const FormData = require('form-data');
const db = require("../../core/database");
const { askChipp } = require("./handlers");
const { getSession, saveSession } = require("./session");
const { parseAI } = require("../../utils/helpers");

const MAX_SIZE = 25 * 1024 * 1024;
const COOLDOWN = 4000;
const lastRequests = new Map();
const processedMids = new Set();

setInterval(() => processedMids.clear(), 30000); 

const LIMITS = { IMG: 5, VID: 1, TXT: 50000 };

async function uploadFile({ senderId, data, token, reply }) {
    const clean64 = data.fileBase64.replace(/^data:.*;base64,/, '').replace(/\s/g, '');
    const mime = (data.fileBase64.match(/^data:(.*?);base64,/) || [])[1] || 'application/octet-stream';
    const buffer = Buffer.from(clean64, 'base64');
    
    if (buffer.length > MAX_SIZE) throw new Error("file too big.");

    const form = new FormData();
    form.append('recipient', JSON.stringify({ id: senderId }));
    form.append('message', JSON.stringify({ attachment: { type: mime.startsWith('image/') ? 'image' : 'file', payload: {} } }));
    form.append('filedata', buffer, { filename: data.fileName || 'file.bin', contentType: mime, knownLength: buffer.length });

    if (data.messageBody) await reply(data.messageBody);

    await axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${token}`, form, {
        headers: form.getHeaders(), maxContentLength: Infinity, maxBodyLength: Infinity
    });
}

module.exports.config = {
  name: "amdus",
  author: "sethdico",
  version: "75.0",
  category: "AI",
  description: "Advanced AI with real-time info, file/image generation, and media recognition. Analyzes images and docs directly; videos require a reply for processing.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 0,
};

module.exports.run = async function ({ event, args, api, reply }) {
  const userId = event.sender.id;
  const mid = event.message?.mid;

  if (mid) {
    if (processedMids.has(mid)) return;
    processedMids.add(mid);
  }

  const query = args.join(" ").trim();
  const token = global.PAGE_ACCESS_TOKEN;

  const now = Date.now();
  const last = lastRequests.get(userId) || 0;
  if (now - last < COOLDOWN && !global.ADMINS.has(userId)) return reply(`wait ${Math.ceil((COOLDOWN - (now - last)) / 1000)}s.`);
  lastRequests.set(userId, now);

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, userId);

  try {
    const currentAttachments = event.message?.attachments || [];
    const repliedAttachments = event.message?.reply_to?.attachments || [];
    
    let context = [];
    let counts = { img: 0, vid: 0 };
    const seenUrls = new Set();

    for (const file of repliedAttachments) {
        const url = file.payload.url;
        if (seenUrls.has(url)) continue;
        seenUrls.add(url);

        if (file.type === "image" && counts.img < LIMITS.IMG) {
            context.push(`[replied_image: ${url}]`);
            counts.img++;
        } 
        else if (file.type === "video" && counts.vid < LIMITS.VID) {
            context.push(`[analyze_replied_video: ${url}]`);
            counts.vid++;
        }
        else if (file.type === "file") {
            const ext = path.extname(url.split('?')[0]).toLowerCase();
            if (['.txt', '.js', '.json', '.md', '.py', '.docx', '.doc', '.pdf'].includes(ext)) {
                context.push(`[read_replied_doc: ${url}]`);
            }
        }
    }

    for (const file of currentAttachments) {
        const url = file.payload.url;
        if (seenUrls.has(url)) continue; 
        seenUrls.add(url);

        if (file.type === "image" && counts.img < LIMITS.IMG) {
            context.push(`[image: ${url}]`);
            counts.img++;
        } 
        else if (file.type === "file") {
            const ext = path.extname(url.split('?')[0]).toLowerCase();
            if (['.txt', '.js', '.json', '.md', '.py', '.docx', '.doc', '.pdf'].includes(ext)) {
                context.push(`[document: ${url}]`);
            }
        }
    }

    let finalPrompt = context.length ? `${context.join("\n")}\n\nUser Query: ${query || "Analyze the provided context."}` : query;
    if (!finalPrompt) return reply("I am Amdusbot. Ask me anything, send an image, or reply to a video.");

    const session = getSession(userId);
    const res = await askChipp(finalPrompt, null, session);

    if (!res || res.error) return reply("AI search/recognition service is currently offline.");
    if (res.data?.chatSessionId) saveSession(userId, res.data.chatSessionId);
    
    const text = parseAI(res);
    if (!text) return reply("No response generated.");

    try {
        const jsonMatch = text.match(/\{"fileName":".*?","fileBase64":".*?"\}/s);
        if (jsonMatch) {
            const fileData = JSON.parse(jsonMatch[0]);
            fileData.messageBody = text.substring(0, jsonMatch.index).trim();
            await uploadFile({ senderId: userId, data: fileData, token, reply });
            return; 
        }
    } catch (e) {}
    
    const linkMatch = text.match(/(https?:\/\/[^\s)]+\.(?:pdf|docx|doc|xlsx|txt|jpg|png|mp4|zip)(?:\?[^\s)]*)?)/i);

    if (linkMatch) {
        const url = linkMatch[0];
        const msgBody = text.replace(url, "").trim();
        
        try {
            const fileRes = await axios.get(url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(fileRes.data);
            const fileName = path.basename(url.split("?")[0]) || "file.bin";
            const mime = fileRes.headers['content-type'] || 'application/octet-stream';

            const type = mime.startsWith('image/') ? 'image' : (mime.startsWith('video/') ? 'video' : 'file');
            const form = new FormData();
            form.append('recipient', JSON.stringify({ id: userId }));
            form.append('message', JSON.stringify({ attachment: { type, payload: {} } }));
            form.append('filedata', buffer, { filename: fileName, contentType: mime, knownLength: buffer.length });

            if (msgBody) await reply(msgBody);
            
            await axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${token}`, form, {
                headers: form.getHeaders(), maxContentLength: Infinity, maxBodyLength: Infinity
            });
        } catch (err) {
            reply(`${msgBody}\n\n[Link: ${url}]`);
        }
    } else {
        reply(text);
    }

  } catch (err) {
    console.error("Core AI Error:", err.message);
    reply("The system encountered an error processing your media or query.");
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, userId);
  }
};
