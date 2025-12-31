const axios = require("axios");
const https = require("https");

const http = axios.create({
    timeout: 60000, 
    httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
    headers: { 'User-Agent': 'Amduspage/Bot' }
});

const parseAI = (res) => {
    if (!res || !res.data) return null;
    const d = res.data;
    
    // standard formats
    if (d.choices?.[0]?.message?.content) return d.choices[0].message.content;
    if (d.message) return d.message;
    if (d.response) return d.response;
    if (d.answer) return d.answer;
    if (d.result) return d.result;
    if (d.content) return d.content;
    if (typeof d === 'string') return d;
    
    return null;
};

function log(event) {
    if (event.message?.is_echo || !event.sender) return;
    const type = global.ADMINS?.has(event.sender.id) ? "admin" : "user";
    const text = event.message?.text || "media";
    global.log.info(`[${type}] ${event.sender.id}: ${text}`);
}

function getEventType(event) {
    if (event.postback) return "postback";
    if (event.message) {
        if (event.message.reply_to) return "message_reply";
        if (event.message.attachments) return "attachment";
        return "text"; 
    }
    return "unknown";
}

async function fetchWithRetry(requestFn, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try { 
            return await requestFn(); 
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
        }
    }
}

module.exports = { http, parseAI, log, getEventType, fetchWithRetry };
