const db = require("../core/database");

module.exports.config = { 
    name: "broadcast", 
    author: "sethdico",
    category: "Admin",
    description: "send an announcement to everyone.",
    adminOnly: true,
    usePrefix: false,
    cooldown: 10 
};

module.exports.run = async ({ event, args, api, reply }) => {
    const msg = args.join(" ");
    if (!msg) return reply("what's the announcement?");

    try {
        const users = await db.getAllUsers();
        const recipients = users.filter(u => u.userId !== event.sender.id);

        if (!recipients.length) return reply("no users to reach.");

        reply(`📢 queueing announcement for ${recipients.length} users...`);

        for (const u of recipients) {
            global.apiQueue.add(async () => {
                try {
                    await api.sendMessage(`📢 **announcement**\n\n${msg}`, u.userId);
                } catch (e) {}
            });
        }
    } catch (e) { 
        reply("broadcast failed to initialize."); 
    }
};
