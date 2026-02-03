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
const userLock = new Set();
const BAN_TIERS = { 1: 10800000, 2: 259200000, 3: null };

setInterval(() => processedMids.clear(), 60000);

async function executeAction(action, event, api, reply) {
    const name = action.tool?.toLowerCase();
    const cmd = global.client.commands.get(name) || global.client.commands.get(global.client.aliases.get(name));
    if (!cmd) return;

    if (name === "remind") return await cmd.run({ event, args: [action.time, action.msg], api, reply });
    if (name === "pinterest") {
        try {
            await cmd.run({ event, args: [action.query, (action.count || 5).toString()], api, reply });
        } catch (e) {
            const gmage = global.client.commands.get("gmage");
            if (gmage) await gmage.run({ event, args: [action.query], api, reply });
        }
        return;
    }
    await cmd.run({ event, args: [action.query], api, reply });
}

async function handleBan(userId, reason, reply) {
    if (global.ADMINS.has(userId)) return reply("safety: admin bypass.");
    const user = await db.Ban.findOne({ userId });
    const level = user ? Math.min(user.level + 1, 3) : 1;
    const time = BAN_TIERS[level];
    await db.addBan(userId, reason, level, time);
    global.BANNED_USERS.add(userId);
    reply(`🚫 security: banned ${time ? (level === 1 ? "3h" : "3d") : "permanently"}.\nreason: ${reason}`);
}

async function upload(senderId, data, token, reply) {
    const clean = data.fileBase64.replace(/^data:.*;base64,/, '').replace(/\s/g, '');
    const mime = (data.fileBase64.match(/^data:(.*?);base64,/) || [])[1] || 'application/octet-stream';
    const buffer = Buffer.from(clean, 'base64');
    if (buffer.length > MAX_SIZE) return;
    const form = new FormData();
    form.append('recipient', JSON.stringify({ id: senderId }));
    form.append('message', JSON.stringify({ attachment: { type: mime.startsWith('image/') ? 'image' : 'file', payload: {} } }));
    form.append('filedata', buffer, { filename: data.fileName || 'file.bin', contentType: mime, knownLength: buffer.length });
    if (data.messageBody) await reply(data.messageBody);
    await axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${token}`, form, { headers: form.getHeaders() });
}

module.exports.config = {
    name: "amdus",
    author: "sethdico",
    version: "255.0",
    category: "AI",
    description: "Main AI. real time info, image/videos/doc vision, doc/image generation, math rendering, and ability to use the bots command",
    adminOnly: false,
    usePrefix: false,
    cooldown: 0,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const uid = event.sender.id;
    const mid = event.message?.mid;
    if (mid && processedMids.has(mid)) return;
    if (userLock.has(uid)) return;

    const last = lastRequests.get(uid) || 0;
    if (Date.now() - last < COOLDOWN && !global.ADMINS.has(uid)) return;

    if (mid) processedMids.add(mid);
    lastRequests.set(uid, Date.now());
    userLock.add(uid);

    const query = args.join(" ").trim();
    const token = global.PAGE_ACCESS_TOKEN;
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, uid);

    try {
        const atts = [...(event.message?.reply_to?.attachments || []), ...(event.message?.attachments || [])];
        let ctx = [];
        const seen = new Set();
        for (const f of atts) {
            if (seen.has(f.payload.url)) continue;
            seen.add(f.payload.url);
            const ext = path.extname(f.payload.url.split('?')[0]).toLowerCase();
            const type = f.type === "image" ? "image_url" : (f.type === "video" ? "video_url" : "document_url");
            if (f.type !== "file" || ['.txt', '.js', '.json', '.md', '.py', '.docx', '.doc', '.pdf'].includes(ext)) {
                ctx.push(`[${type}]: ${f.payload.url}`);
            }
        }

        if (ctx.length > 0 && !query) {
            userLock.delete(uid);
            return reply("media received. reply with a question.");
        }

        const res = await askChipp(ctx.length ? `${ctx.join("\n")}\n\nuser_query: ${query}` : query, null, getSession(uid));
        const text = parseAI(res);
        if (!text) {
            userLock.delete(uid);
            return reply("no response.");
        }

        const json = text.match(/\{[\s\S]*?\}/);
        if (json) {
            try {
                const act = JSON.parse(json[0]);
                if (act.action === "ban") { userLock.delete(uid); return await handleBan(uid, act.reason, reply); }
                if (act.tool) { userLock.delete(uid); return await executeAction(act, event, api, reply); }
            } catch (e) {}
        }

        const math = text.match(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g);
        if (math) {
            const clean = text.replace(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g, "").replace(/\s+/g, " ").trim();
            if (clean) await reply(clean.toLowerCase());
            for (const m of math) {
                const raw = m.replace(/\$\$|\\\[|\\\]|\\\(|\\\)/g, "").trim();
                const url = `https://latex.codecogs.com/png.image?%5Cdpi%7B200%7D%20%5Cbg_white%20${encodeURIComponent(raw)}`;
                await api.sendAttachment("image", url, uid);
            }
        } else {
            const gen = text.match(/\{"fileName":".*?","fileBase64":".*?"\}/s);
            if (gen) {
                const data = JSON.parse(gen[0]);
                data.messageBody = text.substring(0, gen.index).trim();
                await upload(uid, data, token, reply);
            } else {
                const link = text.match(/(https?:\/\/[^\s)]+\.(?:pdf|docx|doc|xlsx|txt|jpg|png|mp4|zip)(?:\?[^\s)]*)?)/i);
                if (link) {
                    const url = link[0];
                    const msg = text.replace(url, "").trim();
                    const fRes = await axios.get(url, { responseType: 'arraybuffer' });
                    const buffer = Buffer.from(fRes.data);
                    const type = fRes.headers['content-type']?.startsWith('image/') ? 'image' : (fRes.headers['content-type']?.startsWith('video/') ? 'video' : 'file');
                    const form = new FormData();
                    form.append('recipient', JSON.stringify({ id: uid }));
                    form.append('message', JSON.stringify({ attachment: { type, payload: {} } }));
                    form.append('filedata', buffer, { filename: path.basename(url.split("?")[0]) || "file.bin", contentType: fRes.headers['content-type'] });
                    if (msg) await reply(msg);
                    await axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${token}`, form, { headers: form.getHeaders() });
                } else {
                    await reply(text.toLowerCase());
                }
            }
        }
    } catch (err) {
        console.error(err.message);
    } finally {
        userLock.delete(uid);
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
    }
};
