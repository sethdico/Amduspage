const axios = require("axios");

module.exports.config = {
    name: "venice",
    author: "Sethdico",
    version: "1.5-Lite",
    category: "AI",
    description: "Venice AI (Uncensored-style model).",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api }) {
    const question = args.join(" ");
    if (!question) return api.sendMessage("🎭 Usage: venice <question>", event.sender.id);

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id).catch(()=>{});

    try {
        const response = await axios.get("https://shin-apis.onrender.com/ai/venice", {
            params: { 
                question: question,
                // Add a timestamp to prevent caching on the API side
                _: Date.now() 
            },
            timeout: 40000
        });

        const reply = response.data.response || response.data.answer;
        
        if (reply) {
            api.sendMessage(`🎭 **Venice AI**\n━━━━━━━━━━━━━━━━\n${reply}`, event.sender.id);
        } else {
            throw new Error("Empty response");
        }
    } catch (e) {
        api.sendMessage("❌ Venice is silent right now.", event.sender.id);
    }
};
