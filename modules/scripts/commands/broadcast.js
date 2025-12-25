const axios = require("axios");
const fs = require("fs");
const path = require("path");
const QUEUE_FILE = path.join(__dirname, "broadcast_queue.json");

module.exports.config = {
    name: "broadcast",
    author: "Sethdico",
    version: "3.2",
    category: "Admin",
    description: "send global announcement.",
    adminOnly: true,
    usePrefix: false,
    cooldown: 0,
};

module.exports.run = async function ({ event, args, api }) {
    const senderID = event.sender.id;
    if (!global.ADMINS.has(senderID)) return; 

    const msg = args.join(" ");
    if (!msg) return api.sendMessage("📢 usage: broadcast <message>", senderID);

    try {
        const res = await axios.get(`https://graph.facebook.com/v21.0/me/conversations?fields=participants&limit=100&access_token=${global.PAGE_ACCESS_TOKEN}`);
        const users = res.data.data.map(c => c.participants.data[0].id);

        users.forEach(id => {
            api.sendMessage(`📢 **announcement**\n\n${msg}`, id).catch(() => {});
        });

        api.sendMessage(`✅ sent to ${users.length} users.`, senderID);
    } catch (e) {
        api.sendMessage("❌ failed.", senderID);
    }
};
