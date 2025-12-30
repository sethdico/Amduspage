const spamMap = new Map();
const db = require("../modules/database");
const { humanTyping } = require("../modules/utils");

module.exports = async function (event, api) {
    if (!event.sender?.id) return;
    const senderID = event.sender.id;
    const reply = (msg) => api.sendMessage(msg, senderID);
    const isAdmin = global.ADMINS.has(senderID);

    if (global.MAINTENANCE_MODE && !isAdmin) {
        return reply(`🛠️ **MAINTENANCE MODE**\n\n${global.MAINTENANCE_REASON}`);
    }

    if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
        const info = await api.getUserInfo(senderID);
        return reply(`👋 Hi ${info.first_name || "there"}! Type 'help' to start.`);
    }

    if (event.message?.is_echo) return;
    const body = event.message?.text || event.postback?.payload || "";
    const hasAttachments = !!(event.message?.attachments);
    if (!body && !hasAttachments) return;

    // FLOW AUTO-CATCH: Now uses Quick Replies for the commands themselves
    const categories = ["AI", "FUN", "UTILITY", "ADMIN"];
    const words = body.trim().split(/\s+/);
    if (words.length === 1 && categories.includes(body.toUpperCase())) {
        const cat = body.toUpperCase();
        let cmdList = [];
        for (const [name, cmd] of global.client.commands) {
            if (cmd.config.category?.toUpperCase() === cat) cmdList.push(name);
        }
        return api.sendQuickReply(`📁 **${cat} COMMANDS:**\nTap one to run it:`, cmdList.slice(0, 10), senderID);
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
        } catch (e) {
            console.error(e);
            reply(`❌ Logic error in ${cmdName}.`);
        }
    } else if ((body.length > 3 || hasAttachments) && !event.message?.is_echo) {
        const ai = global.client.commands.get("ai");
        if (ai) {
            try {
                // Humanize: bot "types" before AI replies
                await api.sendTypingIndicator(true, senderID);
                await ai.run({ event, args: body.trim().split(/\s+/), api, reply });
            } finally {
                if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
            }
        }
    }
};
