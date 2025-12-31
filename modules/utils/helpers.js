const CONSTANTS = require('../../config/constants');

function sanitize(input) {
    if (typeof input !== 'string') return '';
    return input.trim().slice(0, CONSTANTS.MAX_MESSAGE_LENGTH * 2);
}

function parseAI(res) {
    if (!res || !res.data) return null;
    const d = res.data;
    
    if (d.choices?.[0]?.message?.content) return sanitize(d.choices[0].message.content);
    if (d.message) return sanitize(d.message);
    if (d.response) return sanitize(d.response);
    if (d.answer) return sanitize(d.answer);
    if (d.result) return sanitize(d.result);
    if (d.content) return sanitize(d.content);
    if (typeof d === 'string') return sanitize(d);
    
    return null;
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

async function retry(fn, retries = CONSTANTS.MAX_RETRIES) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(r => setTimeout(r, CONSTANTS.RETRY_DELAY * Math.pow(2, i)));
        }
    }
}

function chunkText(text, size = CONSTANTS.MAX_MESSAGE_LENGTH) {
    const chunks = [];
    let current = 0;
    
    while (current < text.length) {
        chunks.push(text.slice(current, current + size));
        current += size;
    }
    
    return chunks;
}

module.exports = {
    sanitize,
    parseAI,
    getEventType,
    retry,
    chunkText
};
