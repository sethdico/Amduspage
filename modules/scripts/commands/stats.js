const os = require('os');
const db = require("../../database");

module.exports.config = {
    name: "stats", author: "Sethdico", version: "2.0", category: "Admin", description: "check bot health and usage stats.", adminOnly: true, usePrefix: false, cooldown: 5
};

module.exports.run = async function ({ reply }) {
    const mem = process.memoryUsage();
    const uptime = process.uptime();
    const hrs = Math.floor(uptime / 3600);
    const mins = Math.floor((uptime % 3600) / 60);

    // Get usage stats from DB
    const topCmds = await db.getStats();
    const usageMsg = topCmds.slice(0, 5).map(c => `• ${c.command}: ${c.count}`).join("\n") || "No data yet.";

    const msg = `📊 **SYSTEM STATS**
━━━━━━━━━━━━━━━━
🤖 **CMDS:** ${global.client.commands.size}
🛡️ **ADMINS:** ${global.ADMINS.size}
🚫 **BANNED:** ${global.BANNED_USERS.size}

📈 **TOP USAGE:**
${usageMsg}

🧠 **MEMORY:** ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB
🖥️ **UPTIME:** ${hrs}h ${mins}m
📡 **PLATFORM:** ${os.platform()}`;

    reply(msg);
};
