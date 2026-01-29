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
const warnings = new Map();

const LIMITS = { IMG: 3, VID: 1, TXT: 50000 };

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

async function enforceSafety(userId, reply) {
    const count = (warnings.get(userId) || 0) + 1;
    warnings.set(userId, count);

    if (count === 1) return reply("warning 1 of 2. stop.");
    if (count === 2) return reply("warning 2 of 2. last warning.");
    
    try {
        await db.addBan(userId, "unethical behavior");
        global.BANNED_USERS.add(userId);
        return reply("banned.");
    } catch (e) {
        return reply("error.");
    }
}

module.exports.config = {
  name: "amdus",
  author: "sethdico",
  version: "68.0",
  category: "AI",
  description: "real time info, vision for images/videos/file and generation, and safety enforcement.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 0,
};

module.exports.run = async function ({ event, args, api, reply }) {
  const userId = event.sender.id;
  const query = args.join(" ").trim();
  const token = global.PAGE_ACCESS_TOKEN;

  const now = Date.now();
  const last = lastRequests.get(userId) || 0;
  if (now - last < COOLDOWN) return reply(`wait ${Math.ceil((COOLDOWN - (now - last)) / 1000)}s.`);
  lastRequests.set(userId, now);

  const norm = (query || "").toLowerCase().replace(/[^\w\s]/g, '').trim();
  if (["who are you", "what are you"].includes(norm)) return reply("i am amdusbot. ask me anything.");

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, userId);

  try {
    const attachments = [...(event.message?.attachments || []), ...(event.message?.reply_to?.attachments || [])];
    let context = [];
    let counts = { img: 0, vid: 0 };

    for (const file of attachments) {
        if (file.type === "image" && counts.img < LIMITS.IMG) {
            context.push(`[image: ${file.payload.url}]`);
            counts.img++;
        } 
        else if (file.type === "video" && counts.vid < LIMITS.VID) {
            context.push(`\nanalyze video: ${file.payload.url}`);
            counts.vid++;
        }
        else if (file.type === "file") {
            const url = file.payload.url;
            const ext = path.extname(url.split('?')[0]).toLowerCase();
            
            if (['.txt', '.js', '.json', '.md', '.py', '.c', '.cpp'].includes(ext)) {
                try {
                    const res = await axios.get(url, { responseType: 'text', timeout: 5000 });
                    let txt = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
                    if (txt.length > LIMITS.TXT) txt = txt.substring(0, LIMITS.TXT) + "\n...[cut]";
                    context.push(`\n[content: ${file.title}]\n${txt}\n[end]`);
                } catch (e) {
                    context.push(`\nanalyze doc link: ${url}`);
                }
            } else {
                context.push(`\nread doc: ${url}`);
            }
        }
    }

    let finalPrompt = context.length ? `${context.join("\n")}\n\nquery: ${query || "analyze."}` : query;
    if (!finalPrompt) return reply("i am amdusbot.");

    const session = getSession(userId);
    const res = await askChipp(finalPrompt, null, session);

    if (!res || res.error) return reply("api error.");
    if (res.data?.chatSessionId) saveSession(userId, res.data.chatSessionId);
    
    const text = parseAI(res);
    if (!text) return reply("no response.");

    if (text.includes('"action": "ban"') || text.includes('"action":"ban"')) {
        return enforceSafety(userId, reply);
    }

    try {
        const jsonMatch = text.match(/\{"fileName":".*?","fileBase64":".*?"\}/s);
        if (jsonMatch) {
            const fileData = JSON.parse(jsonMatch[0]);
            fileData.messageBody = text.substring(0, jsonMatch.index).trim();
            await uploadFile({ senderId: userId, data: fileData, token, reply });
            return; 
        }
    } catch (e) {}
    
    const linkMatch = text.match(/(https?:\/\/[^\s)]+\.(?:pdf|docx|xlsx|txt|jpg|png|mp4|zip)(?:\?[^\s)]*)?)/i) 
                   || (text.includes("chipp.ai/api/downloads") ? text.match(/(https?:\/\/[^\s)]+)/) : null);

    if (linkMatch) {
        const url = linkMatch[0];
        const msg = text.replace(url, "").trim();
        
        try {
            const fileRes = await axios.get(url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(fileRes.data);
            const fileName = path.basename(url.split("?")[0]) || "file.bin";
            const mime = fileRes.headers['content-type'] || 'application/octet-stream';

            try {
                const asText = buffer.toString('utf8');
                if (asText.includes('"fileBase64":')) {
                    const json = JSON.parse(asText);
                    await uploadFile({ senderId: userId, data: { fileName: json.fileName, fileBase64: json.fileBase64, messageBody: msg }, token, reply });
                    return;
                }
            } catch (ignore) {}

            const type = mime.startsWith('image/') ? 'image' : (mime.startsWith('video/') ? 'video' : 'file');
            const form = new FormData();
            form.append('recipient', JSON.stringify({ id: userId }));
            form.append('message', JSON.stringify({ attachment: { type, payload: {} } }));
            form.append('filedata', buffer, { filename: fileName, contentType: mime, knownLength: buffer.length });

            if (msg) await reply(msg);
            
            await axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${token}`, form, {
                headers: form.getHeaders(), maxContentLength: Infinity, maxBodyLength: Infinity
            });

        } catch (err) {
            reply(`${msg}\n\n[link: ${url}]`);
        }
    } else {
        reply(text);
    }

  } catch (err) {
    console.error("error:", err.message);
    reply("system error.");
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, userId);
  }
};
