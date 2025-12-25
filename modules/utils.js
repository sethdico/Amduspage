const axios = require("axios");
const https = require("https");

// create a shared connection that stays open
// this makes the bot much faster because it doesn't handshake every time
const http = axios.create({
    timeout: 20000, // 20s timeout
    httpsAgent: new https.Agent({ keepAlive: true }),
    headers: { 'User-Agent': 'Amduspage/Bot' }
});

function getEventType(event) {
    // figure out what kind of message this is
    if (event.postback) return "postback";
    if (event.message) {
        if (event.message.attachments) return "attachment";
        if (event.message.reply_to) return "reply";
        return "text"; 
    }
    return "unknown";
}

function log(event) {
    if (event.message?.is_echo) return;
    const sender = global.ADMINS.has(event.sender?.id) ? "ADMIN" : "USER";
    console.log(`[${sender}] Msg received`);
}

module.exports = { http, log, getEventType };
