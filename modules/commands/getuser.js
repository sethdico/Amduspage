const db = require("../core/database");

module.exports.config = {
    name: "getuser",
    author: "sethdico",
    category: "Admin",
    adminOnly: true,
    usePrefix: false
};

module.exports.run = async function ({ event, args, api, reply }) {
    const senderID = event.sender.id;

    try {
        const users = await db.UserStat.find().sort({ lastActive: -1 }).limit(10).lean();
        if (!users.length) return reply("database empty.");

        let txt = "ðŸ“‹ user database\n\n";

        for (let i = 0; i < users.length; i++) {
            const u = users[i];
            let displayName = u.name;

            if (displayName === "messenger user") {
                const liveInfo = await api.getUserInfo(u.userId);
                displayName = liveInfo.name;
            }

            const status = global.BANNED_USERS.has(u.userId) ? "ðŸš« " : "ðŸ‘¤ ";
            txt += `${i + 1}. ${status}${displayName}\nid: ${u.userId}\n\n`;
        }

        reply(txt.toLowerCase());
    } catch (e) {
        reply("failed to fetch list.");
    }
};
