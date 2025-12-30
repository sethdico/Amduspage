const spamMap = new Map();
const db = require("../modules/database");

module.exports = async function (event, api) {
    if (!event.sender?.id) return;
    const senderID = event.sender.id;
    const reply = (msg) => api.sendMessage(msg, senderID);
    const isAdmin = global.ADMINS.has(senderID);

    // 1. Get started / Welcome
    if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
        const info = await api.getUserInfo(senderID);
        return reply(`👋 Hi ${info.first_name || "there"}! Type 'help' to start.`);
    }

    if (event.message?.is_echo) return;

    // 2. Standardize Input (Handle Postbacks as Text for Lite compatibility)
    let body = event.message?.text || event.postback?.payload || "";
    const hasAttachments = !!(event.message?.attachments);
    if (!body && !hasAttachments) return;

    // 3. MAINTENANCE GATEKEEPER
    if (global.MAINTENANCE_MODE && !isAdmin) {
        return reply(`🛠️ **MAINTENANCE MODE**\n━━━━━━━━━━━━━━━━\n${global.MAINTENANCE_REASON}`);
    }

    // 4. COMMAND DETECTION (PRIORITY #1)
    const prefix = global.PREFIX || ".";
    const isPrefixed = body.startsWith(prefix);
    const cleanInput = isPrefixed ? body.slice(prefix.length).trim() : body.trim();
    
    const args = cleanInput.split(/\s+/);
    const cmdName = args.shift().toLowerCase();

    const command = global.client.commands.get(cmdName) || 
                    global.client.commands.get(global.client.aliases.get(cmdName));

    if (command) {
        if (command.config.adminOnly && !isAdmin) return reply("⛔ Admin only.");
        try {
            await command.run({ event, args, api, reply });
            return; // EXIT HERE: Stops AI from replying to commands
        } catch (e) {
            console.error(e);
            return reply(`❌ Error in ${cmdName}.`);
        }
    }

    // 5. ANTI-SPAM
    let userData = spamMap.get(senderID) || { count: 0, time: Date.now() };
    if (Date.now() - userData.time > 5000) { userData.count = 0; userData.time = Date.now(); }
    userData.count++;
    spamMap.set(senderID, userData);
    if (userData.count > 10) return reply("⏳ Slow down."); 

    // 6. AI FALLBACK (Only if no command was found)
    const ai = global.client.commands.get("ai");
    if (ai && (body.length > 0 || hasAttachments)) {
        try {
            await ai.run({ event, args: body.trim().split(/\s+/), api, reply });
        } finally {
            if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
        }
    }
};
