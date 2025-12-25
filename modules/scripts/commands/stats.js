const os = require('os');

module.exports.config = {
    name: "stats",
    author: "Sethdico",
    version: "1.0",
    category: "Admin",
    description: "View system performance and bot statistics.",
    adminOnly: true,
    usePrefix: true,
    cooldown: 5
};

module.exports.run = async function ({ api, reply }) {
    const memUsage = process.memoryUsage();
    const toMB = (bytes) => (bytes / 1024 / 1024).toFixed(2);

    const statsMsg = `📊 **SYSTEM STATISTICS**
━━━━━━━━━━━━━━━━
🤖 **Commands:** ${global.client.commands.size}
🛡️ **Admins:** ${global.ADMINS.size}
🚫 **Banned:** ${global.BANNED_USERS.size}

🧠 **RAM USAGE**
• Resident Set: ${toMB(memUsage.rss)} MB
• Heap Used: ${toMB(memUsage.heapUsed)} MB
• Heap Total: ${toMB(memUsage.heapTotal)} MB

🖥️ **SERVER**
• Platform: ${os.platform()} (${os.arch()})
• CPU Cores: ${os.cpus().length}
• Uptime: ${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`;

    reply(statsMsg);
};
