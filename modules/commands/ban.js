const db = require("../core/database");

module.exports.config = {
    name: "ban",
    aliases: ["unban"],
    author: "sethdico",
    category: "Admin",
    description: "ban or unban users",
    adminOnly: true,
    usePrefix: false,
    cooldown: 0
};

module.exports.run = async function ({ args, reply }) {
    const action = args[0]?.toLowerCase();
    const isUnban = action === "unban";
    
    let targetID = isUnban ? args[1] : (action === "ban" ? args[1] : args[0]);
    let reason = args.slice(isUnban ? 2 : (action === "ban" ? 2 : 1)).join(" ") || "no reason";

    if (!targetID || isNaN(targetID)) {
<<<<<<< HEAD
        return reply("to ban: ban <user id> <reason>\nto unban: unban <user id>");
    }

    if (global.ADMINS.has(targetID)) {
        return reply("can't ban an admin user");
=======
        return reply("𝗕𝗔𝗡\n\nusage:\nban <id> <reason>\nunban <id>");
    }

    if (global.ADMINS.has(targetID)) {
        return reply("can't ban an admin");
>>>>>>> 6590e5687fd16e076ec192408df9b73ccbc7977f
    }

    if (isUnban) {
        await db.removeBan(targetID);
        global.BANNED_USERS.delete(targetID);
        return reply(`unbanned ${targetID}`);
    }

    try {
        await db.addBan(targetID, reason);
        global.BANNED_USERS.add(targetID);
        reply(`banned ${targetID}\nreason: ${reason}`.toLowerCase());
    } catch (e) {
<<<<<<< HEAD
        reply("something went wrong while banning");
=======
        reply("failed to ban");
>>>>>>> 6590e5687fd16e076ec192408df9b73ccbc7977f
    }
};
