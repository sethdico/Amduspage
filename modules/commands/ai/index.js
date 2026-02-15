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

async function executeAction(action, event, api, reply) {
    const cmdName = action.tool?.toLowerCase();
    const command = global.client.commands.get(cmdName) || global.client.commands.get(global.client.aliases.get(cmdName));
    
    if (!command) return;

    if (cmdName === "remind") {
        return await command.run({ event, args: [action.time, action.msg], api, reply });
    }

    if (cmdName === "pinterest") {
        try {
            await command.run({ event, args: [action.query, (action.count || 5).toString()], api, reply });
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
    if (global.ADMINS.has(userId)) return reply("safety: admin bypass active.");

    const existing = await db.Ban.findOne({ userId });
    const level = existing ? Math.min(existing.level + 1, 3) : 1;
    const config = BAN_TIERS[level];

    await db.addBan(userId, reason, level, config);
    global.BANNED_USERS.add(userId);

    const durationText = config ? `for ${level === 1 ? "3h" : "3d"}` : "permanently";
    reply(`ðŸš« security: banned ${durationText}.\nreason: ${reason}`);
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
    version: "46.8",
    category: "AI",
    description: "Main amdus ai. Video/image/document recognition, file generation and image edit/generation, real-time info and able to use some of the commands. ",
    adminOnly: false,
    usePrefix: false,
    cooldown: 0,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const uid = String(event.sender.id);
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
                ctx.push(`[${type}_url]: ${f.payload.url}`);
            }
        }

        if (ctx.length > 0 && !query) {
            userLock.delete(uid);
            return reply("media received. reply to the image/video/doc/docx with your question.");
        }

        const session = getSession(uid);
        const res = await askChipp(ctx.length ? `${ctx.join("\n")}\n\nuser_query: ${query}` : query, null, session);
        
        if (!res || res.error) {
            userLock.delete(uid);
            return reply("api offline.");
        }

        if (res.data?.chatSessionId) {
            saveSession(uid, res.data.chatSessionId);
        }

        const text = parseAI(res);
        if (!text) { userLock.delete(uid); return reply("no response."); }

        const urlRegex = /(https?:\/\/[^\s)]+)/gi;
        const urls = text.match(urlRegex);
        if (urls) {
            for (let rawUrl of urls) {
                const url = rawUrl.replace(/[).,]+$/, ''); 
                if (url.includes('chipp-images')) {
                    await api.sendAttachment("image", url, uid);
                } else if (url.includes('chipp-application-files')) {
                    await api.sendAttachment("file", url, uid);
                }
            }
        }

        const jsonMatch = text.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
            try {
                const act = JSON.parse(jsonMatch[0]);
                if (act.action === "ban") {
                    userLock.delete(uid);
                    return await handleTieredBan(uid, act.reason || "violation", reply);
                }
                if (act.tool) {
                    userLock.delete(uid);
                    return await executeAction(act, event, api, reply);
                }
            } catch (e) {}
        }

        const math = text.match(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g);
        if (math) {
            const cleanText = text.replace(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g, "").trim();
            if (cleanText) await reply(cleanText.toLowerCase());
            for (const m of math) {
                const raw = m.replace(/\$\$|\\\[|\\\]|\\\(|\\\)/g, "").trim();
                const mathUrl = `https://latex.codecogs.com/png.image?%5Cdpi%7B200%7D%20%5Cbg_white%20${encodeURIComponent(raw)}`;
                await api.sendAttachment("image", mathUrl, uid);
            }
        } else {
            const gen = text.match(/\{"fileName":".*?","fileBase64":".*?"\}/s);
            if (gen) {
                const data = JSON.parse(gen[0]);
                data.messageBody = text.substring(0, gen.index).trim();
                await upload(uid, data, token, reply);
            } else {
                const cleanText = urls ? text.replace(urlRegex, '').trim() : text;
                if (cleanText) await reply(cleanText.toLowerCase());
            }
        }
    } catch (err) {
        console.error(err.message);
    } finally {
        userLock.delete(uid);
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
    }
};
