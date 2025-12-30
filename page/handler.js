const spamMap = new Map();
const db = require("../modules/database");

module.exports = async function (event, api) {
    if (!event.sender?.id) return;
    const senderID = event.sender.id;
    const reply = (msg) => api.sendMessage(msg, senderID);
    const isAdmin = global.ADMINS.has(senderID);

    // 1. SPEED FIX: Name Caching (Prioritizes performance)
    let name = global.userCache.get(senderID);
    if (!name) {
        try {
            const info = await api.getUserInfo(senderID);
            name = `${info.first_name} ${info.last_name}`;
            global.userCache.set(senderID, name);
        } catch (e) { name = "User"; }
    }

    // 2. MAINTENANCE GATEKEEPER
    if (global.MAINTENANCE_MODE && !isAdmin) {
        return reply(`🛠️ **MAINTENANCE MODE**\n━━━━━━━━━━━━━━━━\n${global.MAINTENANCE_REASON}`);
    }

    // 3. WELCOME LOGIC (Get Started)
    if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
        return reply(`👋 Hi ${name.split(" ")[0]}! Type 'help' to start.`);
    }

    if (event.message?.is_echo) return;
    const body = (event.message?.text || event.postback?.payload || "").trim();
    const hasAttachments = !!(event.message?.attachments);
    if (!body && !hasAttachments) return;

    // 4. FLOW AUTO-CATCH (Category Buttons)
    const categories = ["AI", "FUN", "UTILITY", "ADMIN"];
    const words = body.split(/\s+/);
    if (words.length === 1 && categories.includes(body.toUpperCase())) {
        const cat = body.toUpperCase();
        if (cat === "ADMIN" && !isAdmin) return; // Silent block
        let cmdNames = [];
        for (const [n, cmd] of global.client.commands) {
            if (cmd.config.category?.toUpperCase() === cat) cmdNames.push(n);
        }
        return reply(`📁 **${cat} COMMANDS:**\n━━━━━━━━━━━━━━━━\n${cmdNames.sort().join(", ")}\n\nType 'help <cmd>' for details.`);
    }

    // 5. COMMAND IDENTIFICATION
    const cmdName = words.shift().toLowerCase();
    const command = global.client.commands.get(cmdName) || global.client.commands.get(global.client.aliases.get(cmdName));

    if (command) {
        if (command.config.adminOnly && !isAdmin) return reply("⛔ Admin only.");
        try {
            db.trackCommand(cmdName, senderID, name);
            await command.run({ event, args: words, api, reply });
            return; // Command found, stop here.
        } catch (e) {
            console.error(e);
            return reply(`❌ Error in ${cmdName}.`);
        } finally {
            if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
        }
    } 

    // 6. ANTI-SPAM (Admins bypass this)
    if (!isAdmin) {
        let userData = spamMap.get(senderID) || { count: 0, time: Date.now() };
        if (Date.now() - userData.time > 5000) { userData.count = 0; userData.time = Date.now(); }
        userData.count++;
        spamMap.set(senderID, userData);
        if (userData.count === 11) return reply("⏳ Woah! Slow down a bit.");
        if (userData.count > 10) return; 
    }

    // 7. AI FALLBACK (Only for normal conversation or image replies)
    if ((body.length > 0 || hasAttachments) && !event.message?.is_echo) {
        const ai = global.client.commands.get("ai");
        const reactions = ["lol", "haha", "wow", "lmao", "ok", "okay", "?", "nice"];
        
        // Prevent AI from replying to short reactions or if command not found
        if (ai && !reactions.includes(body.toLowerCase())) {
            try {
                if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);
                // Pass raw body to AI for full context
                await ai.run({ event, args: body.split(/\s+/), api, reply });
            } finally {
                if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
            }
        }
    }
};
