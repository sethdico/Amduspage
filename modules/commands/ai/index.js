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
const BAN_TIERS = { 1: 10800000, 2: 259200000, 3: null };

setInterval(() => processedMids.clear(), 60000);

async function handleTieredBan(userId, reason, reply) {
    if (global.ADMINS.has(userId)) return reply("safety: admin bypass active.");
    const existing = await db.Ban.findOne({ userId });
    const level = existing ? Math.min(existing.level + 1, 3) : 1;
    const duration = BAN_TIERS[level];
    await db.addBan(userId, reason, level, duration);
    global.BANNED_USERS.add(userId);
    reply(`🚫 security: banned ${duration ? (level === 1 ? "3h" : "3d") : "permanently"}.\nreason: ${reason}`);
}

async function upload(senderId, data, token, reply) {
    const clean = data.fileBase64.replace(/^data:.*;base64,/, '').replace(/\s/g, '');
    const mime = (data.fileBase64.match(/^data:(.*?);base64,/) || [])[1] || 'application/octet-stream';
    const buffer = Buffer.from(clean, 'base64');
    if (buffer.length > MAX_SIZE) return;
    const form = new FormData();
    form.append('recipient', JSON.stringify({ id: senderId }));
    form.append('message', JSON.stringify({ attachment: { type: mime.startsWith('image/') ? 'image' : 'file', payload: {} } }));
    form.append('filedata', buffer, { filename: data.fileName || 'file.bin', contentType: mime });
    if (data.messageBody) await reply(data.messageBody);
    await axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${token}`, form, { headers: form.getHeaders() });
}

module.exports.config = {
    name: "amdus",
    author: "sethdico",
    version: "46.7",
    category: "AI",
    description: "Main amdus ai. (AI may change its function over time so check the bots post)",
    adminOnly: false,
    usePrefix: false,
    cooldown: 0,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const uid = event.sender.id;
    const mid = event.message?.mid;
    if ((mid && processedMids.has(mid)) || userLock.has(uid)) return;

    const last = lastRequests.get(uid) || 0;
    if (Date.now() - last < COOLDOWN_MS && !global.ADMINS.has(uid)) return;

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
            const url = f.payload.url;
            if (seen.has(url)) continue;
            seen.add(url);
            const ext = path.extname(url.split('?')[0]).toLowerCase();
            const type = f.type === "image" ? "image" : (f.type === "video" ? "video" : "document");
            if (f.type !== "file" || ['.txt', '.js', '.json', '.md', '.py', '.docx', '.doc', '.pdf'].includes(ext)) {
                ctx.push(`[${type}_url]: ${url}`);
            }
        }

        if (ctx.length > 0 && !query) {
            userLock.delete(uid);
            return reply("media received. reply with your question.");
        }

        const res = await askChipp(ctx.length ? `${ctx.join("\n")}\n\nuser_query: ${query}` : query, null, getSession(uid));
        const text = parseAI(res);
        if (!text) { userLock.delete(uid); return reply("no response."); }

        const json = text.match(/\{[\s\S]*?\}/);
        if (json) {
            try {
                const act = JSON.parse(json[0]);
                if (act.action === "ban") { userLock.delete(uid); return await handleTieredBan(uid, act.reason, reply); }
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
                await reply(text.toLowerCase());
            }
        }
    } catch (err) {
        console.error(err.message);
    } finally {
        userLock.delete(uid);
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
    }
};
