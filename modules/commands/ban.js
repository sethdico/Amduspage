const db = require("../core/database");

module.exports.config = {
    name: "ban",
    aliases: ["unban"],
    author: "Sethdico",
    category: "Admin",
    adminOnly: true,
    usePrefix: false
};

module.exports.run = async function ({ event, args, reply }) {
    const content = (event.message?.text || event.postback?.payload || "").trim().toLowerCase();
    const isUnban = content.startsWith("unban") || args[0] === "unban";

    let targetID = args[0];
    let reason = args.slice(1).join(" ") || "violation";

    if (args[0] === "unban" && args[1]) {
        targetID = args[1];
    }

    if (!targetID || isNaN(targetID)) {
        return reply("usage: ban/unban <uid>");
    }

    if (isUnban) {
        try {
            await db.removeBan(targetID);
            global.BANNED_USERS.delete(targetID);
            return reply(`unbanned ${targetID}.`);
        } catch (e) {
            return reply("failed to unban.");
        }
    }

    try {
        await db.addBan(targetID, reason);
        global.BANNED_USERS.add(targetID);
        return reply(`banned ${targetID}.`);
    } catch (e) {
        return reply("failed to ban.");
    }
};
