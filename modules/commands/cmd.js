const db = require("../core/database");

module.exports.config = {
    name: "cmd",
    author: "sethdico",
    category: "Admin",
    description: "manage command status",
    adminOnly: true,
    usePrefix: false,
    cooldown: 0
};

module.exports.run = async function ({ args, reply }) {
    const action = args[0]?.toLowerCase();
    const target = args[1]?.toLowerCase();

    if (!action || !target) {
        return reply("𝗖𝗢𝗠𝗠𝗔𝗡𝗗 𝗠𝗔𝗡𝗔𝗚𝗘𝗥\n\nusage:\ncmd off <name>\ncmd on <name>\n\nexample:\ncmd off gmage");
    }

    if (!global.client.commands.has(target)) return reply("𝗠𝗔𝗜𝗡𝗧𝗘𝗡𝗔𝗡𝗖𝗘\n\nusage:\nmaintenance on <reason>\nmaintenance off\n\nexample:\nmaintenance on system update");

    if (action === "off") {
        global.disabledCommands.add(target);
        await db.saveSetting("disabled_cmds", Array.from(global.disabledCommands));
        return reply(`${target} is now disabled`);
    }

    if (action === "on") {
        global.disabledCommands.delete(target);
        await db.saveSetting("disabled_cmds", Array.from(global.disabledCommands));
        return reply(`${target} is now enabled`);
    }
};
