const db = require("../modules/core/database");
const cooldowns = new Map();
const userLock = new Set();

module.exports = async function (event, api) {
    if (!event.sender?.id) return;
    
    const id = event.sender.id;
    const reply = (msg) => api.sendMessage(msg, id);
    
    const userRole = await db.getRole(id);
    const isAdmin = userRole === "admin";
    const isMod = userRole === "moderator" || isAdmin;

    try {
        const userInfo = await api.getUserInfo(id);
        db.syncUser(id, userInfo);
    } catch (e) {
        db.syncUser(id);
    }

    if (global.MONITOR_MODE && !isAdmin) {
        for (const adminId of global.ADMINS) {
            api.sendMessage(`[MONITOR] ${id}: ${event.message?.text || "Media"}`, adminId);
        }
    }

    if (global.MAINTENANCE_MODE && !isAdmin) {
        return reply(`Bot is under maintenance.`);
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
        if (command.config.modOnly && !isMod) return;

        if (global.disabledCommands?.has(command.config.name) && !isAdmin) {
            return reply("This command is temporarily disabled.");
        }

        if (command.config.cooldown && !isAdmin) {
            const key = `${id}-${command.config.name}`;
            const lastUsed = cooldowns.get(key) || 0;
            const timeLeft = (lastUsed + (command.config.cooldown * 1000)) - Date.now();
            if (timeLeft > 0) return reply(`Cooldown: ${Math.ceil(timeLeft / 1000)}s`);
            cooldowns.set(key, Date.now());
        }

        try {
            db.trackCommandUsage(command.config.name);
            await command.run({ event, args, api, reply });
            return;
        } catch (e) { 
            return reply("Command execution error."); 
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
