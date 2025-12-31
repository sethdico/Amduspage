const db = require("../../database");

global.tempUserList = global.tempUserList || new Map();

module.exports.config = {
    name: "getuser",
    author: "Sethdico",
    category: "Admin",
    adminOnly: true,
    usePrefix: false
};

module.exports.run = async function ({ event, args, api, reply }) {
    const senderID = event.sender.id;
    const target = args[0];

    // view specific user info
    if (target && !isNaN(target)) {
        const lastList = global.tempUserList.get(senderID);
        if (!lastList) return reply("❌ type getuser first");

        const user = lastList[parseInt(target) - 1];
        if (!user) return reply("❌ user not found");

        const isBanned = global.BANNED_USERS.has(user.userId);

        const profileMsg = 
            `👤 USER DETAILS\n` +
            `────────────────\n` +
            `Name: ${user.name}\n` +
            `ID: ${user.userId}\n` +
            `Status: ${isBanned ? "Banned" : "Active"}\n\n` +
            
            `Gender: ${user.gender || "Not set"}\n` +
            `Birthday: ${user.birthday || "Not set"}\n` +
            `Location: ${user.locale || "Unknown"}\n\n` +
            
            `Usage: ${user.count} messages\n` +
            `Last Active: ${new Date(user.lastActive).toLocaleString()}\n` +
            `────────────────`;

        const buttons = [
            { 
                type: "postback", 
                title: isBanned ? "Unban User" : "Ban User", 
                payload: isBanned ? `unban ${user.userId}` : `ban ${user.userId}` 
            },
            { 
                type: "web_url", 
                url: user.link || `https://www.facebook.com/${user.userId}`, 
                title: "View Facebook" 
            },
            { 
                type: "postback", 
                title: "Send Message", 
                payload: `call ${user.userId} Admin wants to talk.` 
            }
        ];

        if (user.profilePic) await api.sendAttachment("image", user.profilePic, senderID);
        return api.sendButton(profileMsg, buttons, senderID);
    }

    // show list of users
    try {
        const users = await db.getAllUsers();
        
        if (!users || users.length === 0) {
            return reply("nobody's been active lately");
        }

        // filter out yourself lol
        const others = users.filter(u => u.userId !== senderID);

        if (others.length === 0) {
            return reply("just you rn, nobody else used the bot");
        }

        global.tempUserList.set(senderID, others);

        let list = "👥 Recent Users (3 Days)\n────────────────\n";
        others.forEach((u, i) => {
            const isBanned = global.BANNED_USERS.has(u.userId);
            list += `${i + 1}. ${isBanned ? "🚫" : "👤"} ${u.name}\n`;
        });

        list += `\n💡 Type 'getuser [number]' for info.`;
        
        reply(list);
    } catch (e) {
        reply("❌ couldn't load users");
    }
};
