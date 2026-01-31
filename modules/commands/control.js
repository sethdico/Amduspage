const db = require("../core/database");
module.exports.config = { name: "control", category: "Admin", adminOnly: true };
module.exports.run = async function ({ args, reply }) {
    const action = args[0]?.toLowerCase();
    const cmd = args[1]?.toLowerCase();
    let disabled = await db.getSetting("disabled_cmds") || [];
    if (action === "off" && cmd) {
        if (!disabled.includes(cmd)) disabled.push(cmd);
        await db.saveSetting("disabled_cmds", disabled);
        global.disabledCommands = new Set(disabled);
        return reply(`${cmd} disabled.`);
    }
    if (action === "on" && cmd) {
        disabled = disabled.filter(c => c !== cmd);
        await db.saveSetting("disabled_cmds", disabled);
        global.disabledCommands = new Set(disabled);
        return reply(`${cmd} enabled.`);
    }
    reply("Usage: control <on/off> <cmd>");
};
