const os = require("os");

module.exports.config = {
    name: "uptime",
    author: "Sethdico (Ported)",
    version: "1.0",
    category: "Utility",
    description: "System Stats",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = function ({ event }) {
    const time = process.uptime();
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    // Pagebot usually runs on limited RAM in free tier, so this is useful
    const usedMemory = process.memoryUsage().heapUsed / 1024 / 1024;

    const msg = `
╔════════════╗
   📊 SYSTEM STATS
╚════════════╝
⏱️ **Uptime:** ${hours}h ${minutes}m ${seconds}s
🧠 **RAM Used:** ${usedMemory.toFixed(2)} MB
🐧 **OS:** ${os.type()}
    `;
    api.sendMessage(msg, event.sender.id);
};
