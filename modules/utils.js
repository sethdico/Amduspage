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
    // Checks every known key used by community APIs
    return d.answer || d.response || d.result || d.message || d.content || (typeof d === 'string' ? d : null);
};

function getEventType(event) {
    if (event.postback) return "postback";
    if (event.message) {
        if (event.message.attachments) return "attachment";
        if (event.message.reply_to) return "reply";
        return "text"; 
    }
    return "unknown";
}

module.exports = { http, parseAI, getEventType };
