const db = require("../core/database");
module.exports.config = { name: "access", category: "Admin", adminOnly: true };
module.exports.run = async function ({ args, reply }) {
    const action = args[0]?.toLowerCase();
    const targetID = args[1];
    const role = args[2]?.toLowerCase();
    if (action === "list") {
        const users = await db.UserStat.find({ role: { $ne: "user" } });
        let msg = "Roles:\n";
        users.forEach(u => msg += `- ${u.name}: ${u.role}\n`);
        return reply(msg || "No special roles.");
    }
    if (!targetID || !role) return reply("Usage: access set <uid> <moderator/user>");
    if (global.ADMINS.has(String(targetID))) return reply("Admins are immune.");
    await db.setRole(targetID, role);
    global.userCache.delete(`role_${targetID}`);
    reply(`Role for ${targetID} updated to ${role}.`);
};
