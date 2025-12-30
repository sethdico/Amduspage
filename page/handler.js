const spamMap = new Map();
const db = require("../modules/database");
const { humanTyping } = require("../modules/utils");

module.exports = async function (event, api) {
    if (!event.sender?.id) return;
    const senderID = event.sender.id;
    const reply = (msg) => api.sendMessage(msg, senderID);
    const isAdmin = global.ADMINS.has(senderID);

    // 1. Maintenance Gatekeeper
    if (global.MAINTENANCE_MODE && !isAdmin) {
        const msg = `🛠️ **MAINTENANCE MODE**\n━━━━━━━━━━━━━━━━\n${global.MAINTENANCE_REASON}`;
        const buttons = [{ type: "web_url", url: "https://www.facebook.com/seth09asher", title: "Message Owner" }];
        return api.sendButton(msg, buttons, senderID);
    }

    // 2. Welcome logic
    if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
        const info = await api.getUserInfo(senderID);
        return reply(`👋 Hi ${info.first_name || "there"}! Type 'help' to start.`);
    }

    if (event.message?.is_echo) return;
    const body = (event.message?.text || event.postback?.payload || "").trim();
    const hasAttachments = !!(event.message?.attachments);
    if (!body && !hasAttachments) return;

    // 3. Command Identification
    const prefix = global.PREFIX;
    const isPrefixed = body.startsWith(prefix);
    const input = isPrefixed ? body.slice(prefix.length).trim() : body;
    const args = input.split(/\s+/);
    const cmdName = args.shift().toLowerCase();

    const command = global.client.commands.get(cmdName) || global.client.commands.get(global.client.aliases.get(cmdName));

    if (command) {
        if (command.config.adminOnly && !isAdmin) return reply("⛔ Admin only.");
        try {
            db.trackCommand(cmdName);
            await humanTyping(api, senderID, body);
            await command.run({ event, args, api, reply });
            return;
        } catch (e) {
            reply(`❌ Logic error in ${cmdName}.`);
        } finally { if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID); }
    } 

    // 4. Category Catch
    const categories = ["AI", "FUN", "UTILITY", "ADMIN"];
    if (categories.includes(body.toUpperCase())) {
        let list = `📁 **${body.toUpperCase()} COMMANDS:**\n\n`;
        for (const [name, cmd] of global.client.commands) if (cmd.config.category?.toUpperCase() === body.toUpperCase()) list += `• ${name}\n`;
        return reply(list);
    }

    // 5. AI Fallback (Reactions filtered)
    if ((body.length > 0 || hasAttachments) && !event.message?.is_echo) {
        const ai = global.client.commands.get("ai");
        const reactions = ["lol", "haha", "wow", "ok", "okay", "nice"];
        if (ai && !reactions.includes(body.toLowerCase())) {
            try {
                await api.sendTypingIndicator(true, senderID);
                await ai.run({ event, args: body.split(/\s+/), api, reply });
            } finally { if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID); }
        }
    }
};
