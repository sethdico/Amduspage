const db = require("../core/database");

module.exports.config = {
    name: "ban",
    aliases: ["unban"],
    author: "Sethdico",
    category: "Admin",
    adminOnly: true
};

module.exports.run = async function ({ event, args, reply }) {
    const body = (event.message?.text || "").trim().toLowerCase();
    const isUnban = body.startsWith("unban") || args[0] === "unban";

    let targetID = args[0];
    let reason = args.slice(1).join(" ") || "No reason";

    if (args[0] === "unban") targetID = args[1];

    if (!targetID || isNaN(targetID)) return reply("Please provide a valid User ID.");

    if (global.ADMINS.has(targetID)) {
        return reply("You cannot ban an administrator.");
    }

    if (isUnban) {
        try {
            await db.removeBan(targetID);
            global.BANNED_USERS.delete(targetID);
            return reply(`Successfully unbanned user ${targetID}.`);
        } catch (e) {
            return reply("Unban failed.");
        }
    }

    try {
        await db.addBan(targetID, reason);
        global.BANNED_USERS.add(targetID);
        return reply(`User ${targetID} has been banned.`);
    } catch (e) {
        return reply("Ban failed.");
    }
};
