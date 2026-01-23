const db = require("../core/database");

module.exports.config = {
    name: "uid",
    category: "Utility",
    adminOnly: false,
    usePrefix: false
};

module.exports.run = async ({ event, args, api, reply }) => {
    const targetID = args[0] || event.sender.id;

    try {
        const info = await api.getUserInfo(targetID);
        const name = info ? `${info.first_name} ${info.last_name}` : "unknown user";
        const dbUser = await db.getUserData(targetID);
        
        let msg = `user info\n\nname: ${name}\nid: ${targetID}\n`;
        
        if (dbUser) {
            msg += `msgs: ${dbUser.count}\n`;
            msg += `last active: ${new Date(dbUser.lastActive).toLocaleDateString()}`;
        } else {
            msg += `status: not in database`;
        }
        
        reply(msg);
        
        if (info && info.profile_pic) {
            api.sendAttachment("image", info.profile_pic, event.sender.id);
        }
    } catch (e) {
        reply(`id: ${targetID}`);
    }
};
