const db = require("../core/database");

global.tempUserList = global.tempUserList || new Map();

module.exports.config = {
    name: "getuser",
    category: "Admin",
    adminOnly: true,
    usePrefix: false
};

module.exports.run = async function ({ event, args, api, reply }) {
    const senderID = event.sender.id;
    const index = args[0];

    // info for specific user
    if (index && !isNaN(index)) {
        const list = global.tempUserList.get(senderID);
        if (!list) return reply("type getuser first");

        const user = list[parseInt(index) - 1];
        if (!user) return reply("user not found");

        const banned = global.BANNED_USERS.has(user.userId);
        
        let msg = `name: ${user.name}\nid: ${user.userId}\nstatus: ${banned ? "banned" : "active"}\n`;
        msg += `msgs: ${user.count || 0}\n`;
        msg += `active: ${new Date(user.lastActive).toLocaleDateString()}`;

        const btns = [
            { type: "web_url", url: `https://www.facebook.com/${user.userId}`, title: "facebook link" },
            { type: "postback", title: banned ? "unban" : "ban", payload: (banned ? `unban ${user.userId}` : `ban ${user.userId}`) }
        ];

        if (user.profilePic) api.sendAttachment("image", user.profilePic, senderID).catch(()=>{});
        // ensure sendButton errors don't crash
        return api.sendButton(msg, btns, senderID).catch((e) => {
            console.error("sendButton failed:", e);
            reply(msg);
        });
    }

    // show list
    try {
        const all = await db.getAllUsers();
        const others = all.filter(u => u.userId !== senderID).slice(0, 15);

        if (others.length === 0) return reply("no users in database");

        const updated = await Promise.all(
            others.map(async (u) => {
                // try to fix 'new user' if api gives details
                if (!u.name || u.name === "new user" || u.name === "user") {
                    const fb = await api.getUserInfo(u.userId);
                    if (fb && fb.name) {
                        u.name = fb.name;
                        u.profilePic = fb.pic;
                        db.syncUser(u.userId, fb); 
                    } else {
                        u.name = "new user";
                    }
                }
                return u;
            })
        );

        global.tempUserList.set(senderID, updated);

        let txt = "recent users\n\n";
        updated.forEach((u, i) => {
            const isBanned = global.BANNED_USERS.has(u.userId);
            txt += `${i + 1}. ${isBanned ? "🚫 " : ""}${u.name} (${u.count || 0})\n`;
        });
        txt += "\ntype getuser [number] for info";
        
        reply(txt);
    } catch (e) {
        console.error("getuser failed:", e);
        reply("failed to load user list");
    }
};
