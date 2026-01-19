const db = require("../core/database");

module.exports.config = {
    name: "ban",
    author: "Sethdico",
    category: "Admin",
    adminOnly: true,
    usePrefix: false
};

module.exports.run = async function ({ event, args, api, reply }) {
    // supports:
    // ban <userId> [reason...]
    // unban <userId>
    const action = (args[0] || '').toLowerCase();
    if (action === 'unban' && args[1]) {
        const id = args[1];
        try {
            await db.removeBan(id);
            global.BANNED_USERS.delete(id);
            return reply(`unbanned ${id}`);
        } catch (e) {
            console.error("unban failed:", e);
            return reply("failed to unban");
        }
    }

    // If first arg looks like an id, treat as ban <id>
    if (args[0] && /^(\d+)$/.test(args[0])) {
        const id = args[0];
        const reason = args.slice(1).join(' ') || 'no reason';
        try {
            await db.addBan(id, reason);
            global.BANNED_USERS.add(id);
            return reply(`banned ${id} — ${reason}`);
        } catch (e) {
            console.error("ban failed:", e);
            return reply("failed to ban");
        }
    }

    // fallback usage
    return reply("Usage:\nban <userId> [reason]\nunban <userId>");
};
