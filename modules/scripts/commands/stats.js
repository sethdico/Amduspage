const os = require('os');

module.exports.config = {
    name: "stats",
    author: "Sethdico",
    version: "1.2",
    category: "Admin",
    description: "check bot health.",
    adminOnly: true,
    usePrefix: false,
    cooldown: 5
};

module.exports.run = async function ({ reply }) {
    const mem = process.memoryUsage();
    const uptime = process.uptime();
    const hrs = Math.floor(uptime / 3600);
    const mins = Math.floor((uptime % 3600) / 60);

    const msg = `📊 **stats**
━━━━━━━━━━━━━━━━
🤖 **cmds:** ${global.client.commands.size}
🛡️ **admins:** ${global.ADMINS.size}
🚫 **banned:** ${global.BANNED_USERS.size}

🧠 **memory**
• used: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB
• total: ${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB

🖥️ **system**
• load: ${os.loadavg()[0].toFixed(2)}
• uptime: ${hrs}h ${mins}m
• platform: ${os.platform()}`;

    reply(msg);
};
