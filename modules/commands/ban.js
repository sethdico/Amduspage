const db = require("../core/database");

module.exports.config = {
    name: "ban",
    aliases: ["unban"],
    author: "sethdico",
    category: "Admin",
    adminOnly: true,
    usePrefix: false
};

module.exports.run = async function ({ event, args, reply }) {
    const isUnban = args[0] === "unban";
    const targetID = isUnban ? args[1] : args[0];
    const reason = args.slice(isUnban ? 2 : 1).join(" ") || "no reason.";

    if (!targetID || isNaN(targetID)) return reply("usage: ban <id> <reason> or unban <id>");
    if (global.ADMINS.has(targetID)) return reply("can't ban an admin.");

    if (isUnban) {
        await db.removeBan(targetID);
        global.BANNED_USERS.delete(targetID);
        return reply(`unbanned ${targetID}.`);
    }

    await db.addBan(targetID, reason);
    global.BANNED_USERS.add(targetID);
    reply(`banned ${targetID}.\nreason: ${reason}`);
};
