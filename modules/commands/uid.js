module.exports.config = {
    name: "uid",
    author: "sethdico",
    category: "Utility",
    adminOnly: false,
    usePrefix: false
};

module.exports.run = async function ({ event, args, api, reply }) {
    const targetID = args[0] || event.sender.id;

    try {
        const info = await api.getUserInfo(targetID);
        
        const msg = ` user info\n\n` +
                    `name: ${info.name}\n` +
                    `psid: ${targetID}`;

        reply(msg.toLowerCase());
    } catch (e) {
        reply(`id: ${targetID}`);
    }
};
