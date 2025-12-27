const { http } = require("../../utils");

module.exports.config = {
    name: "phind",
    author: "Sethdico",
    version: "1.2",
    category: "AI",
    description: "Search using Phind AI",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const query = args.join(" ");
    if (!query) return reply("🔎 Usage: phind <query>");

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id);

    try {
        // FIXED: Using your exact Playground URL and 'q' parameter
        const res = await http.get("https://api.ccprojectsapis-jonell.gleeze.com/api/phindai", { 
            params: { q: query } 
        });
        
        // Based on your playground, the response is a raw string. 
        // We check if it's a string first, otherwise look for result/response keys.
        const result = typeof res.data === 'string' ? res.data : (res.data.result || res.data.response || res.data.answer);
        
        if (result) {
            api.sendMessage(`🔎 **PHIND**\n━━━━━━━━━━━━━━━━\n${result}`, event.sender.id);
        } else {
            reply("❌ Phind returned an empty response.");
        }

    } catch (e) {
        console.error("Phind Error:", e.message);
        reply("❌ Phind AI is currently offline.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, event.sender.id);
    }
};
