const db = require("../core/database");

global.tempUserList = global.tempUserList || new Map();

module.exports.config = {
    name: "getuser",
    author: "sethdico",
    category: "Admin",
    adminOnly: true,
    usePrefix: false
};

module.exports.run = async function ({ event, args, api, reply }) {
    const senderID = event.sender.id;
    const index = args[0];

    if (index && !isNaN(index)) {
        const list = global.tempUserList.get(senderID);
        if (!list) return reply("list expired. type getuser.");

        const user = list[parseInt(index) - 1];
        if (!user) return reply("user not found.");

        const isBanned = global.BANNED_USERS.has(user.userId);
        
        let msg = `name: ${user.name}\nid: ${user.userId}\nrole: ${user.role || 'user'}\n`;
        msg += `status: ${isBanned ? "banned" : "active"}\n`;
        msg += `msgs: ${user.count || 0}\n`;
        msg += `last: ${new Date(user.lastActive).toLocaleString()}`;

        const btns = [
            { type: "web_url", url: `https://www.facebook.com/${user.userId}`, title: "profile" },
            { type: "postback", title: isBanned ? "unban" : "ban", payload: `${isBanned ? 'unban' : 'ban'} ${user.userId}` }
        ];

        return api.sendButton(msg.toLowerCase(), btns, senderID).catch(() => reply(msg.toLowerCase()));
    }

    try {
        const users = await db.UserStat.find().sort({ lastActive: -1 }).limit(20).lean();

        if (!users.length) return reply("db empty.");

        global.tempUserList.set(senderID, users);

        let txt = "user database\n\n";
        users.forEach((u, i) => {
            const status = global.BANNED_USERS.has(u.userId) ? "🚫 " : "";
            const role = u.role !== "user" ? ` [${u.role}]` : "";
            txt += `${i + 1}. ${status}${u.name}${role}\n   id: ${u.userId}\n`;
        });
        txt += "\ntype getuser [number] for details.";
        
        reply(txt.toLowerCase());
    } catch (e) {
        reply("failed to fetch list.");
    }
};
