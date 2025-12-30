const spamMap = new Map();
const db = require("../modules/database");

module.exports = async function (event, api) {
    if (!event.sender?.id) return;
    const senderID = event.sender.id;
    const reply = (msg) => api.sendMessage(msg, senderID);
    const isAdmin = global.ADMINS.has(senderID);

    if (global.MAINTENANCE_MODE && !isAdmin) return reply(`🛠️ **MAINTENANCE MODE**\n\n${global.MAINTENANCE_REASON}`);
    if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
        const info = await api.getUserInfo(senderID);
        return reply(`👋 Hi ${info.first_name || "there"}! Type 'help' to start.`);
    }

    let userData = spamMap.get(senderID) || { count: 0, time: Date.now() };
    if (Date.now() - userData.time > 5000) { userData.count = 0; userData.time = Date.now(); }
    userData.count++;
    spamMap.set(senderID, userData);
    if (userData.count > 10) return; 

    if (event.message?.is_echo) return;
    const body = event.message?.text || event.postback?.payload || "";
    const hasAttachments = !!(event.message?.attachments);
    if (!body && !hasAttachments) return;

    if (["AI", "FUN", "UTILITY", "ADMIN"].includes(body.toUpperCase())) {
        let list = `📁 **${body.toUpperCase()} COMMANDS:**\n\n`;
        for (const [name, cmd] of global.client.commands) if (cmd.config.category?.toUpperCase() === body.toUpperCase()) list += `• ${name}\n`;
        return reply(list);
    }

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
            reply(`❌ Logic error in ${cmdName}.`);
        } finally { if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID); }
    } else if ((body.length > 3 || hasAttachments) && !event.message?.is_echo) {
        const ai = global.client.commands.get("ai");
        const reactions = ["lol", "haha", "wow", "lmao", "ok", "okay", "?", "nice"];
        if (ai && !reactions.includes(body.toLowerCase())) {
            try { await ai.run({ event, args: body.trim().split(/\s+/), api, reply }); }
            finally { if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID); }
        }
    }
};
