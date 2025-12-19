const axios = require("axios");

module.exports.config = {
    name: "venice",
    author: "Sethdico (Ported)",
    version: "1.0",
    category: "AI",
    description: "Venice AI",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args }) {
    const question = args.join(" ");
    if (!question) return api.sendMessage("⚠️ Usage: venice <question>", event.sender.id);

    api.sendTypingIndicator(true, event.sender.id);

    try {
        const response = await axios.get("https://shin-apis.onrender.com/ai/venice", {
            params: { 
                question: question,
                systemPrompt: "You are a helpful AI."
            }
        });

        const reply = response.data.response || response.data.answer || response.data.result;
        
        if (reply) {
            const msg = `🤖 **Venice AI**\n━━━━━━━━━━━━━━━━\n${reply}`;
            api.sendMessage(msg, event.sender.id);
        } else {
            api.sendMessage("❌ Empty response.", event.sender.id);
        }
    } catch (e) {
        api.sendMessage("❌ Error connecting to Venice.", event.sender.id);
    } finally {
        api.sendTypingIndicator(false, event.sender.id);
    }
};
