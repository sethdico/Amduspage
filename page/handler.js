const db = require("../modules/core/database");
const cooldowns = new Map();
const syncLocks = new Map();

// cleanup old cooldowns every 10 min
setInterval(() => {
    const now = Date.now();
    for (const [key, time] of cooldowns.entries()) {
        if (now - time > 3600000) cooldowns.delete(key);
    }
}, 600000);

module.exports = async function (event, api) {
    if (!event.sender?.id) return;
    
    const id = event.sender.id;
    const reply = (msg) => api.sendMessage(msg, id);
    const isAdmin = global.ADMINS.has(id);
    const now = Date.now();

    let user = global.userCache.get(id);
    
    // user sync (once per 24h)
    try {
        if (Math.random() < 0.01) db.purgeInactiveUsers();

        const needsSync = !user || !user.lastSynced || (now - new Date(user.lastSynced).getTime() > 86400000);
        
        if (needsSync && !syncLocks.has(id)) {
            syncLocks.set(id, true);
            try {
                let dbUser = await db.getUserData(id);
                
                if (!dbUser || !dbUser.lastSynced || (now - new Date(dbUser.lastSynced).getTime() > 86400000)) {
                    const fb = await api.getUserInfo(id);
                    const fbData = {
                        name: fb.name || `${fb.first_name} ${fb.last_name}`,
                        firstName: fb.first_name,
                        lastName: fb.last_name,
                        profilePic: fb.profile_pic,
                        gender: fb.gender,
                        link: fb.link,
                        locale: fb.locale,
                        timezone: fb.timezone
                    };
                    user = await db.syncUser(id, fbData);
                } else {
                    user = await db.syncUser(id);
                }
                global.userCache.set(id, user);
            } finally {
                syncLocks.delete(id);
            }
        } else if (!needsSync) {
            db.syncUser(id);
        }
    } catch (e) {
        if (!user) user = { firstName: "user", name: "user" };
    }

    // maintenance mode
    if (global.MAINTENANCE_MODE && !isAdmin) {
        return reply(`maintenance mode\n\n${global.MAINTENANCE_REASON}`);
    }

    // get started payload
    if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
        return reply(`hey ${user.firstName || 'there'}, type help to start`);
    }

    // ignore echoes
    if (event.message?.is_echo) return;
    
    const body = (event.message?.text || event.postback?.payload || "").trim();
    const hasAttachments = !!(event.message?.attachments);

    // category shortcuts
    const categories = ["AI", "FUN", "UTILITY", "ADMIN"];
    const words = body.split(/\s+/);
    
    if (words.length === 1 && categories.includes(body.toUpperCase())) {
        const cat = body.toUpperCase();
        if (cat === "ADMIN" && !isAdmin) return;
        
        let cmds = [];
        for (const [name, cmd] of global.client.commands) {
            if (cmd.config.category?.toUpperCase() === cat) cmds.push(name);
        }
        return reply(`${cat.toLowerCase()} commands\n${cmds.sort().join(", ")}`);
    }

    // find command
    const cmdName = words.shift().toLowerCase();
    const command = global.client.commands.get(cmdName) || 
                    global.client.commands.get(global.client.aliases.get(cmdName));

    if (command) {
        if (command.config.adminOnly && !isAdmin) return reply("admin only");

        // cooldown check
        if (command.config.cooldown && command.config.cooldown > 0 && !isAdmin) {
            const key = `${id}-${command.config.name}`;
            const lastUsed = cooldowns.get(key) || 0;
            const timeLeft = (lastUsed + (command.config.cooldown * 1000)) - now;

            if (timeLeft > 0) {
                return reply(`wait ${Math.ceil(timeLeft / 1000)}s`);
            }
            cooldowns.set(key, now);
        }

        try {
            db.trackCommandUsage(cmdName);
            await command.run({ event, args: words, api, reply });
        } catch (e) { 
            global.log.error(`error running ${cmdName}:`, e.message);
            reply(`error: ${e.message}`); 
        }
    } 
    // fallback to ai
    else if ((body.length > 3 || hasAttachments) && !event.message?.is_echo) {
        const ai = global.client.commands.get("ai");
        const ignore = ["lol", "haha", "wow", "ok", "okay", "?", "nice", "cool"];
        
        if (ai && !ignore.includes(body.toLowerCase())) {
            try {
                if (api.sendTypingIndicator) api.sendTypingIndicator(true, id).catch(()=>{});
                await ai.run({ event, args: body.split(/\s+/), api, reply });
            } finally { 
                if (api.sendTypingIndicator) api.sendTypingIndicator(false, id).catch(()=>{}); 
            }
        }
    }
};
