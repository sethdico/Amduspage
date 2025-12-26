const axios = require("axios");
const https = require("https");

const http = axios.create({
    timeout: 20000,
    httpsAgent: new https.Agent({ keepAlive: true }),
    headers: { 'User-Agent': 'Amduspage/Bot' }
});

async function fetchWithRetry(requestFn, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try { return await requestFn(); } 
        catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
        }
    }
}

function getEventType(event) {
    if (event.postback) {
        event.message = { text: event.postback.payload }; 
        return "message";
    }
    if (event.message) {
        if (event.message.attachments && event.message.attachments.length > 0) {
            if (event.message.text) return "message";
            return "attachment";
        }
        if (event.message.reply_to) return "reply";
        if (event.message.text) return "message";
    }
    return "unknown";
}

function log(event) {
    if (event.message?.is_echo || !event.sender) return;
    const senderType = global.ADMINS.has(event.sender.id) ? "ADMIN" : "USER";
    const msg = event.message?.text || event.postback?.payload || "[Attachment]";
    console.log(`[${senderType}] ${event.sender.id}: ${msg}`);
}

module.exports = { http, fetchWithRetry, log, getEventType };
