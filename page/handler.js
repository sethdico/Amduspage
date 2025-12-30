const spamMap = new Map();
const db = require("../modules/database");

module.exports = async function (event, api) {
    if (!event.sender?.id) return;
    const senderID = event.sender.id;
    const reply = (msg) => api.sendMessage(msg, senderID);
    const isAdmin = global.ADMINS.has(senderID);

    // 1. SPEED FIX: Name Caching (Don't spam Facebook Graph API)
    let name = global.userCache.get(senderID);
    if (!name) {
        const info = await api.getUserInfo(senderID);
        name = `${info.first_name} ${info.last_name}`;
        global.userCache.set(senderID, name);
    }

    // 2. Maintenance Gate
    if (global.MAINTENANCE_MODE && !isAdmin) {
        return reply(`🛠️ **MAINTENANCE MODE**\n━━━━━━━━━━━━━━━━\n${global.MAINTENANCE_REASON}`);
    }

    // 3. Welcome Logic
    if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
        return reply(`👋 Hi ${name.split(" ")[0]}! Type 'help' to start.`);
    }

    if (event.message?.is_echo) return;
    const body = (event.message?.text || event.postback?.payload || "").trim();
    const hasAttachments = !!(event.message?.attachments);
    if (!body && !hasAttachments) return;

    // 4. Flow Catch (Category Taps)
    const categories = ["AI", "FUN", "UTILITY", "ADMIN"];
    const words = body.split(/\s+/);
    if (words.length === 1 && categories.includes(body.toUpperCase())) {
        const cat = body.toUpperCase();
        if (cat === "ADMIN" && !isAdmin) return;
        let cmdNames = [];
        for (const [name, cmd] of global.client.commands) {
            if (cmd.config.category?.toUpperCase() === cat) cmdNames.push(name);
        }
        return reply(`📁 **${cat} COMMANDS:**\n━━━━━━━━━━━━━━━━\n${cmdNames.sort().join(", ")}\n\nType 'help <cmd>' for details.`);
    }

    // 5. Command Identification
    const cmdName = words.shift().toLowerCase();
    const command = global.client.commands.get(cmdName) || global.client.commands.get(global.client.aliases.get(cmdName));

    if (command) {
        if (command.config.adminOnly && !isAdmin) return reply("⛔ Admin only.");
        try {
            db.trackCommand(cmdName, senderID, name);
            await command.run({ event, args: words, api, reply });
            return;
        } catch (e) {
            reply(`❌ Logic error in ${cmdName}.`);
        } finally { if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID); }
    } 

    // 6. AI Fallback (Reactions filtered)
    else if ((body.length > 3 || hasAttachments) && !event.message?.is_echo) {
        const ai = global.client.commands.get("ai");
        const reactions = ["lol", "haha", "wow", "lmao", "ok", "okay", "?", "nice"];
        if (ai && !reactions.includes(body.toLowerCase())) {
            try {
                if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);
                await ai.run({ event, args: body.split(/\s+/), api, reply });
            } finally {
                if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
            }
        }
    }
};
