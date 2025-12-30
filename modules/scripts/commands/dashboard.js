module.exports.config = {
    name: "dashboard", author: "Sethdico", category: "Admin", adminOnly: true, usePrefix: false
};

module.exports.run = async function ({ event, api }) {
    const buttons = [
        { type: "postback", title: "📊 STATS", payload: "stats" },
        { type: "postback", title: "👥 USERS", payload: "getuser" },
        { type: "postback", title: "🛠️ MAINT", payload: "maintenance" }
    ];
    return api.sendButton("👑 **ADMIN DASHBOARD**\nQuick access to bot control:", buttons, event.sender.id);
};
