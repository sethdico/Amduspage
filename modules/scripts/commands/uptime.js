const os = require("os");

module.exports.config = {
    name: "uptime",
    author: "Sethdico",
    version: "1.1",
    category: "Utility",
    description: "System Stats",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = function ({ event, api }) {
    const time = process.uptime();
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    // Quick RAM calc (MB)
    const used = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

    const msg = `⏱️ **UPTIME**: ${hours}h ${minutes}m ${seconds}s\n🧠 **RAM**: ${used} MB\n🐧 **OS**: ${os.type()}`;
    api.sendMessage(msg, event.sender.id);
};
