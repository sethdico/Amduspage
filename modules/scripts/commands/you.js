const { http } = require("../../utils");
module.exports.config = { name: "you", category: "AI", cooldown: 5 };
module.exports.run = async ({ event, args, api }) => {
    if (!args[0]) return api.sendMessage("🔍 Usage: you <question>", event.sender.id);
    try {
        const res = await http.get("https://betadash-api-swordslush-production.up.railway.app/you", { 
            params: { chat: args.join(" ") } 
        });
        api.sendMessage(`🔍 **You.com**\n${res.data.message || res.data.response}`, event.sender.id);
    } catch (e) { api.sendMessage("❌ You.com is down.", event.sender.id); }
};
