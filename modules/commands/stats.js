const os = require('os');
const db = require("../core/database");

module.exports.config = {
    name: "stats",
    author: "sethdico",
    category: "Admin",
    description: "view system statistics",
    adminOnly: true,
    usePrefix: false,
    cooldown: 5,
    aliases: ["system", "performance", "info"]
};

module.exports.run = async function ({ reply }) {
    try {
        const mem = process.memoryUsage();
        const uptime = process.uptime();
        
        const topCmds = await db.getStats();
        const totalUsers = await db.UserStat.countDocuments();
        const activeToday = await db.UserStat.countDocuments({ 
            lastActive: { $gte: new Date(Date.now() - 86400000) } 
        });
        
        const activeThisHour = await db.UserStat.countDocuments({ 
            lastActive: { $gte: new Date(Date.now() - 3600000) } 
        });
        
        const upStr = `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;
        
        const topList = topCmds.length 
            ? topCmds.slice(0, 5).map((c, i) => `  ${i + 1}. ${c.command} (${c.count})`).join('\n') 
            : "  none yet";

        const msg = `system stats

bot status
  commands: ${global.client.commands.size}
  sessions: ${global.sessions.size()}
  banned: ${global.BANNED_USERS.size}

user stats
  total: ${totalUsers}
  active (24h): ${activeToday}

top commands
${topList}

system info
  ram: ${(mem.heapUsed / 1024 / 1024).toFixed(1)}mb
  uptime: ${upStr}
  os: ${os.platform()} ${os.arch()}`;

        reply(msg.toLowerCase());
    } catch (e) {
        reply("failed to load stats");
    }
};
