const { http } = require("../../utils");

module.exports.config = {
    name: "brave",
    author: "Sethdico",
    version: "1.0",
    category: "AI",
    description: "Privacy-focused search via Brave AI.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const query = args.join(" ");
    if (!query) return reply("🦁 Usage: brave <query>");

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id);

    try {
        // FIXED: Using your exact Endpoint and 'search' parameter
        const res = await http.get("https://betadash-api-swordslush-production.up.railway.app/brave", { 
            params: { search: query } 
        });
        
        // Match the 'response' key provided in your JSON example
        const result = res.data.response || res.data.answer || res.data.result;
        
        if (result) {
            api.sendMessage(`🦁 **BRAVE AI**\n━━━━━━━━━━━━━━━━\n${result}`, event.sender.id);
        } else {
            reply("❌ Brave returned an empty response.");
        }

    } catch (e) {
        console.error("Brave Error:", e.message);
        reply("❌ Brave AI is currently unavailable.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, event.sender.id);
    }
};
