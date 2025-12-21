module.exports.config = {
    name: "uid",
    author: "Sethdico",
    version: "1.2",
    category: "Utility",
    description: "Get your Page-Scoped ID",
    adminOnly: false,
    usePrefix: false, 
    cooldown: 0,
};

module.exports.run = function ({ event }) {
    api.sendMessage(`🆔 **Your Unique ID (PSID):**\n${event.sender.id}\n\n(Use this ID for admin permissions or banning)`, event.sender.id);
};
