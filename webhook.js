const { getEventType } = require('./modules/utils/helpers');
const messageHandler = require('./page/main');
const logger = require('./modules/utils/logger');

module.exports.listen = (event) => {
    if (!event || event.object !== 'page') return;
    
    event.entry.forEach(entry => {
        entry.messaging.forEach(async (ev) => {
            if (!ev.sender?.id || global.BANNED_USERS.has(ev.sender.id)) {
                return;
            }
            
            ev.type = getEventType(ev);
            
            // cache message for replies
            if (ev.message?.mid) {
                const cacheData = {
                    text: ev.message.text,
                    attachments: ev.message.attachments?.map(att => ({
                        type: att.type,
                        payload: att.payload
                    })) || null
                };
                global.messageCache.set(ev.message.mid, cacheData);
            }
            
            // restore replied message from cache
            if (ev.type === 'message_reply') {
                const cached = global.messageCache.get(ev.message.reply_to?.mid);
                if (cached) {
                    ev.message.reply_to.text = cached.text;
                    ev.message.reply_to.attachments = cached.attachments;
                }
            }
            
            if (ev.message?.is_echo) return;
            
            // log event
            const type = global.ADMINS?.has(ev.sender.id) ? 'admin' : 'user';
            const text = ev.message?.text || ev.postback?.payload || 'media';
            logger.info(`[${type}] ${ev.sender.id}: ${text.substring(0, 50)}`);
            
            setImmediate(() => messageHandler(ev));
        });
    });
};
