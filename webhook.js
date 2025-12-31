const utils = require("./modules/utils");
const messageHandler = require("./page/main");

class MessageCache {
    constructor(maxSize, maxAge = 3600000) { 
        this.maxSize = maxSize; 
        this.maxAge = maxAge;
        this.cache = new Map(); 
        // cleanup old entries every 5 min
        setInterval(() => this.cleanup(), 300000);
    }

    cleanup() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.maxAge) {
                this.cache.delete(key);
            }
        }
    }

    set(key, value) {
        if (this.cache.size >= this.maxSize) {
            this.cache.delete(this.cache.keys().next().value);
        }
        this.cache.set(key, { ...value, timestamp: Date.now() });
    }

    get(key) { 
        return this.cache.get(key); 
    }
}

const messagesCache = new MessageCache(500);

module.exports.listen = (event) => {
    if (!event || event.object !== "page") return;
    
    event.entry.forEach(entry => entry.messaging.forEach(async (ev) => {
        if (!ev.sender?.id || global.BANNED_USERS.has(ev.sender.id)) return;
        
        ev.type = await utils.getEventType(ev);
        
        if (ev.message?.mid) {
            const cacheData = { 
                text: ev.message.text,
                attachments: ev.message.attachments ? ev.message.attachments.map(att => ({
                    type: att.type,
                    payload: att.payload 
                })) : null
            };
            messagesCache.set(ev.message.mid, cacheData);
        }

        if (ev.type === "message_reply") {
            const cached = messagesCache.get(ev.message.reply_to?.mid);
            if (cached) {
                ev.message.reply_to.text = cached.text;
                ev.message.reply_to.attachments = cached.attachments;
            }
        }
        
        if (ev.message?.is_echo) return;
        utils.log(ev);
        setImmediate(() => messageHandler(ev));
    }));
};
