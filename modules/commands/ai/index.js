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

setInterval(() => processedMids.clear(), 60000);

const BAN_LEVELS = {
    1: { label: "3 hours", ms: 3 * 60 * 60 * 1000 },
    2: { label: "3 days", ms: 3 * 24 * 60 * 60 * 1000 },
    3: { label: "permanent", ms: null }
};

async function executeAction(action, event, api, reply) {
    const cmdName = action.tool.toLowerCase();
    const command = global.client.commands.get(cmdName) || global.client.commands.get(global.client.aliases.get(cmdName));

    if (!command) return;

    if (cmdName === "remind") {
        return await command.run({ event, args: [action.time, action.msg], api, reply });
    }

    if (cmdName === "pinterest") {
        try {
            const count = action.count || 5;
            await command.run({ event, args: [action.query, count.toString()], api, reply });
        } catch (e) {
            const gmage = global.client.commands.get("gmage");
            if (gmage) await gmage.run({ event, args: [action.query], api, reply });
        }
        return;
    }

    try {
        await command.run({ event, args: [action.query], api, reply });
    } catch (e) {
        console.error(e.message);
    }
}

async function handleTieredBan(userId, reason, reply) {
    if (global.ADMINS.has(userId)) return reply("safety: admin bypass triggered.");

    const existing = await db.Ban.findOne({ userId });
    const level = existing ? Math.min(existing.level + 1, 3) : 1;
    const config = BAN_LEVELS[level];

    await db.addBan(userId, reason, level, config.ms);
    global.BANNED_USERS.add(userId);

    const durationText = config.ms ? `for ${config.label}` : "permanently";
    reply(`🚫 security: banned ${durationText}.\nreason: ${reason}`);
}

async function uploadFile({ senderId, data, token, reply }) {
    const clean64 = data.fileBase64.replace(/^data:.*;base64,/, '').replace(/\s/g, '');
    const mime = (data.fileBase64.match(/^data:(.*?);base64,/) || [])[1] || 'application/octet-stream';
    const buffer = Buffer.from(clean64, 'base64');
    if (buffer.length > MAX_SIZE) return;
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
    version: "160.0",
    category: "AI",
    description: "autonomous agent with sota reasoning, vision, and tool permissions.",
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
        const attachments = [...(event.message?.reply_to?.attachments || []), ...(event.message?.attachments || [])];
        let context = [];
        const seen = new Set();

        for (const file of attachments) {
            const url = file.payload.url;
            if (seen.has(url)) continue;
            seen.add(url);
            if (file.type === "image") context.push(`[image_url]: ${url}`);
            else if (file.type === "video") context.push(`[video_url]: ${url}`);
            else {
                const ext = path.extname(url.split('?')[0]).toLowerCase();
                if (['.txt', '.js', '.json', '.md', '.py', '.docx', '.doc', '.pdf'].includes(ext)) context.push(`[document_url]: ${url}`);
            }
        }

        if (context.length > 0 && !query) {
            userLock.delete(userId);
            return reply("media received. reply with your question.");
        }

        const finalPrompt = context.length ? `${context.join("\n")}\n\nuser_query: ${query}` : query;
        if (!finalPrompt) {
            userLock.delete(userId);
            return reply("i am amdusbot.");
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

        try {
            const action = JSON.parse(text);
            if (action.action === "ban") {
                userLock.delete(userId);
                return handleTieredBan(userId, action.reason || "unethical behavior", reply);
            }
            if (action.tool) {
                userLock.delete(userId);
                return executeAction(action, event, api, reply);
            }
        } catch (e) {}

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
                const type = fileRes.headers['content-type']?.startsWith('image/') ? 'image' : (fileRes.headers['content-type']?.startsWith('video/') ? 'video' : 'file');
                const form = new FormData();
                form.append('recipient', JSON.stringify({ id: userId }));
                form.append('message', JSON.stringify({ attachment: { type, payload: {} } }));
                form.append('filedata', buffer, { filename: path.basename(url.split("?")[0]) || "file.bin", contentType: fileRes.headers['content-type'] });
                if (msgBody) await reply(msgBody);
                await axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${token}`, form, {
                    headers: form.getHeaders(), maxContentLength: Infinity, maxBodyLength: Infinity
                });
            } else {
                await reply(text.toLowerCase());
            }
        }
    } catch (err) {
        console.error(err.message);
    } finally {
        userLock.delete(userId);
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, userId);
    }
};
