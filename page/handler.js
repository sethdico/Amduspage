const spamMap = new Map();
const db = require("../modules/database");

module.exports = async function (event, api) {
    if (!event.sender?.id) return;
    const senderID = event.sender.id;
    const reply = (msg) => api.sendMessage(msg, senderID);
    const isAdmin = global.ADMINS.has(senderID);

    // 1. Welcome Logic
    if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
        const info = await api.getUserInfo(senderID);
        return reply(`👋 Hi ${info.first_name || "there"}! Type 'help' to start.`);
    }

    if (event.message?.is_echo) return;
    const body = event.message?.text || event.postback?.payload || "";
    const hasAttachments = !!(event.message?.attachments);
    if (!body && !hasAttachments) return;

    // 2. Maintenance Gatekeeper
    if (global.MAINTENANCE_MODE && !isAdmin) {
        return reply(`🛠️ **MAINTENANCE MODE**\n━━━━━━━━━━━━━━━━\n${global.MAINTENANCE_REASON}`);
    }

    // 3. FLOW AUTO-CATCH (Fixed: Returns text list instead of bubbles)
    const categories = ["AI", "FUN", "UTILITY", "ADMIN"];
    const words = body.trim().split(/\s+/);
    
    if (words.length === 1 && categories.includes(body.toUpperCase())) {
        const cat = body.toUpperCase();
        let cmdNames = [];
        for (const [name, cmd] of global.client.commands) {
            if (cmd.config.category?.toUpperCase() === cat) cmdNames.push(name);
        }
        let listMsg = `📁 **${cat} COMMANDS:**\n━━━━━━━━━━━━━━━━\n${cmdNames.sort().join(", ")}\n\nType 'help <cmd>' for details.`;
        return reply(listMsg); 
    }

    // 4. Command Logic (Prefix-Free)
    const prefix = global.PREFIX;
    const isPrefixed = body.startsWith(prefix);
    const input = isPrefixed ? body.slice(prefix.length).trim() : body.trim();
    const args = input.split(/\s+/);
    const cmdName = args.shift().toLowerCase();

    const command = global.client.commands.get(cmdName) || global.client.commands.get(global.client.aliases.get(cmdName));

    if (command) {
        if (command.config.adminOnly && !isAdmin) return reply("⛔ Admin only.");
        try {
            db.trackCommand(cmdName);
            await command.run({ event, args, api, reply });
            return;
        } catch (e) {
            console.error(e);
            reply(`❌ Logic error in ${cmdName}.`);
        } finally {
            if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
        }
    } 

    // 5. AI Fallback (With reaction filter)
    else if ((body.length > 3 || hasAttachments) && !event.message?.is_echo) {
        const ai = global.client.commands.get("ai");
        const reactions = ["lol", "haha", "wow", "lmao", "ok", "okay", "?", "nice"];
        if (ai && !reactions.includes(body.toLowerCase())) {
            try {
                if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);
                await ai.run({ event, args: body.trim().split(/\s+/), api, reply });
            } finally {
                if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
            }
        }
    }
};
