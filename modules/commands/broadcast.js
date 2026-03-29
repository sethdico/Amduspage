const db = require("../core/database");

module.exports.config = { 
    name: "broadcast", 
    author: "sethdico",
    category: "Admin",
    description: "send an announcement to everyone.",
    adminOnly: true,
    usePrefix: false,
    cooldown: 15 
};

module.exports.run = async ({ event, args, api, reply }) => {
    const msg = args.join(" ");

    if (!msg) {
        return reply("📢 **broadcast guide**\n━━━━━━━━━━━━━━━━\nhow to use:\n  broadcast <message>\n\nexample:\n  broadcast we have updated the ai memory system!");
    }

    try {
        const users = await db.getAllUsers();
        const recipients = users.filter(u => u.userId !== event.sender.id);

        if (!recipients.length) return reply("no users found to reach.");

        reply(`📢 starting broadcast to ${recipients.length} users. processing in background...`);

        recipients.forEach((u, index) => {
            setTimeout(() => {
                api.sendMessage(`📢 announcement\n\n${msg}`, u.userId).catch(() => {});
            }, index * 50); 
        });

    } catch (e) { 
        reply("broadcast failed to start."); 
    }
};
