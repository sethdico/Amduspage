const path = require("path");
const axios = require('axios');
const FormData = require('form-data');
const db = require("../../core/database");
const { askChipp } = require("./handlers");
const { getSession, saveSession } = require("./session");
const { parseAI } = require("../../utils/helpers");

const MAX_SIZE = 25 * 1024 * 1024;
const COOLDOWN_MS = 4000;
const lastRequests = new Map();
const processedMids = new Set();
const userLock = new Set(); 
const warnings = new Map();

setInterval(() => processedMids.clear(), 60000); 

const LIMITS = { IMG: 5, VID: 1 };

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
    if (count === 2) return reply("last warning.");
    
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
  version: "100.0",
  category: "AI",
  description: "real time info, image, video and document recognition, plus file and image generation.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 0,
};

module.exports.run = async function ({ event, args, api, reply }) {
  const userId = event.sender.id;
  const mid = event.message?.mid;

  if (mid && processedMids.has(mid)) return;
  if (userLock.has(userId)) return; 
  
  const now = Date.now();
  if (now - (lastRequests.get(userId) || 0) < COOLDOWN_MS && !global.ADMINS.has(userId)) return;

  if (mid) processedMids.add(mid);
  lastRequests.set(userId, now);
  userLock.add(userId);

  const query = args.join(" ").trim();
  const token = global.PAGE_ACCESS_TOKEN;

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, userId);

  try {
    const attachments = [
        ...(event.message?.reply_to?.attachments || []),
        ...(event.message?.attachments || [])
    ];
    
    let context = [];
    let counts = { img: 0, vid: 0 };
    const seen = new Set();

    for (const file of attachments) {
        const url = file.payload.url;
        if (seen.has(url)) continue;
        seen.add(url);

        if (file.type === "image" && counts.img < LIMITS.IMG) {
            context.push(`[instruction: analyzeimage] please use your tool to analyze this image url: ${url}`);
            counts.img++;
        } 
        else if (file.type === "video" && counts.vid < LIMITS.VID) {
            context.push(`[instruction: analyzevideo] please use your tool to analyze this video url: ${url}`);
            counts.vid++;
        }
        else if (file.type === "file") {
            const ext = path.extname(url.split('?')[0]).toLowerCase();
            const allowed = ['.txt', '.js', '.json', '.md', '.py', '.docx', '.doc', '.pdf'];
            if (allowed.includes(ext)) {
                context.push(`[instruction: processfile/retrieveurl] please use your tools to read the content of this document url: ${url}`);
            }
        }
    }

    let finalPrompt = context.length ? `${context.join("\n")}\n\nuser query: ${query || "summarize and analyze the provided media."}` : query;
    if (!finalPrompt) {
        userLock.delete(userId);
        return reply("i am amdusbot. ask me anything.");
    }

    const session = getSession(userId);
    const res = await askChipp(finalPrompt, null, session);

    if (!res || res.error) {
        userLock.delete(userId);
        return reply("api offline.");
    }

    if (res.data?.chatSessionId) saveSession(userId, res.data.chatSessionId);
    const text = parseAI(res);
    if (!text) {
        userLock.delete(userId);
        return reply("no response.");
    }

    const isBanAction = /^\{[\s\S]*?"action"[\s\S]*?:[\s\S]*?"ban"[\s\S]*?\}$/.test(text.trim());
    if (isBanAction) {
        userLock.delete(userId);
        return enforceSafety(userId, reply);
    }

    const jsonMatch = text.match(/\{"fileName":".*?","fileBase64":".*?"\}/s);
    if (jsonMatch) {
        const fileData = JSON.parse(jsonMatch[0]);
        fileData.messageBody = text.substring(0, jsonMatch.index).trim();
        await uploadFile({ senderId: userId, data: fileData, token, reply });
    } else {
        const linkMatch = text.match(/(https?:\/\/[^\s)]+\.(?:pdf|docx|doc|xlsx|txt|jpg|png|mp4|zip)(?:\?[^\s)]*)?)/i);
        if (linkMatch) {
            const url = linkMatch[0];
            const msgBody = text.replace(url, "").trim();
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
        } else {
            await reply(text);
        }
    }
  } catch (err) {
    console.error("error:", err.message);
  } finally {
    userLock.delete(userId);
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, userId);
  }
};
