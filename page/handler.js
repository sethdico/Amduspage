const db = require("../modules/core/database");
const cooldowns = new Map();
const userLock = new Set();

module.exports = async function (event, api) {
    if (!event.sender?.id) return;
    
    const id = event.sender.id;
    const reply = (msg) => api.sendMessage(msg, id);
    const isAdmin = global.ADMINS.has(id);

    try {
        const userInfo = await api.getUserInfo(id);
        db.syncUser(id, userInfo || { name: "Messenger User" });
    } catch (e) {
        db.syncUser(id);
    }

    if (global.MAINTENANCE_MODE && !isAdmin) {
        return reply(`The bot is currently under maintenance. Reason: ${global.MAINTENANCE_REASON || "Updates"}`);
    }

    if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
        return reply(`Hello! I am ${global.BOT_NAME}. How can I help you today?`);
    }

    if (event.message?.is_echo) return;
    
    const body = (event.message?.text || event.postback?.payload || "").trim();
    if (!body && !event.message?.attachments) return;

    const args = body.split(/\s+/);
    const cmdName = args.shift()?.toLowerCase();
    
    const command = global.client.commands.get(cmdName) || 
                    global.client.commands.get(global.client.aliases.get(cmdName));

    if (command) {
        if (command.config.adminOnly && !isAdmin) return;
        
        if (command.config.cooldown && !isAdmin) {
            const key = `${id}-${command.config.name}`;
            const lastUsed = cooldowns.get(key) || 0;
            const timeLeft = (lastUsed + (command.config.cooldown * 1000)) - Date.now();
            if (timeLeft > 0) return reply(`Please wait ${Math.ceil(timeLeft / 1000)}s.`);
            cooldowns.set(key, Date.now());
        }

        try {
            db.trackCommandUsage(command.config.name);
            await command.run({ event, args, api, reply });
            return;
        } catch (e) { 
            return reply("An error occurred while running the command."); 
        }
    } 

    const ai = global.client.commands.get("amdus");
    if (ai && !userLock.has(id)) {
        userLock.add(id);
        const safety = setTimeout(() => userLock.delete(id), 45000);
        try {
            if (api.sendTypingIndicator) api.sendTypingIndicator(true, id);
            await ai.run({ event, args: body.split(/\s+/), api, reply });
        } finally { 
            clearTimeout(safety);
            userLock.delete(id);
            if (api.sendTypingIndicator) api.sendTypingIndicator(false, id); 
        }
    }
};
