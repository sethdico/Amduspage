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

    if (index && !isNaN(index)) {
        const list = global.tempUserList.get(senderID);
        if (!list) return reply("list empty. type getuser first.");

        const user = list[parseInt(index) - 1];
        if (!user) return reply("user not found.");

        const isBanned = global.BANNED_USERS.has(user.userId);
        
        let msg = `name: ${user.name}\nid: ${user.userId}\nstatus: ${isBanned ? "banned" : "active"}\n`;
        msg += `msgs: ${user.count || 0}\n`;
        msg += `active: ${new Date(user.lastActive).toLocaleDateString()}`;

        const btns = [
            { type: "web_url", url: `https://www.facebook.com/${user.userId}`, title: "profile" },
            { type: "postback", title: isBanned ? "unban" : "ban", payload: isBanned ? `unban ${user.userId}` : `ban ${user.userId}` }
        ];

        if (user.profilePic) api.sendAttachment("image", user.profilePic, senderID).catch(()=>{});
        
        return api.sendButton(msg, btns, senderID).catch(() => reply(msg));
    }

    try {
        const all = await db.getAllUsers();
        const others = all.filter(u => u.userId !== senderID).slice(0, 15);

        if (others.length === 0) return reply("db empty.");

        const updated = await Promise.all(
            others.map(async (u) => {
                if (!u.name || u.name === "new user" || u.name === "user") {
                    const fb = await api.getUserInfo(u.userId);
                    if (fb && fb.name) {
                        u.name = fb.name;
                        u.profilePic = fb.pic;
                        db.syncUser(u.userId, fb); 
                    }
                }
                return u;
            })
        );

        global.tempUserList.set(senderID, updated);

        let txt = "users list\n\n";
        updated.forEach((u, i) => {
            const isBanned = global.BANNED_USERS.has(u.userId);
            txt += `${i + 1}. ${isBanned ? "🚫 " : ""}${u.name}\n   id: ${u.userId}\n`;
        });
        txt += "\ntype getuser [number]";
        
        reply(txt);
    } catch (e) {
        reply("failed to load list.");
    }
};
