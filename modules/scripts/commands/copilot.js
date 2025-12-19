const axios = require("axios");

module.exports.config = {
    name: "copilot",
    author: "Sethdico",
    version: "1.1",
    category: "AI",
    description: "Microsoft's smart AI. /copilot think-deeper or gpt-5",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args }) {
    if (args.length === 0) {
        return api.sendMessage("⚠️ Please provide a message.\n\nUsage:\n/copilot <message>\n/copilot gpt-5 <message>", event.sender.id);
    }

    const validModels = ["default", "think-deeper", "gpt-5"];
    let model = "default";
    let message = args.join(" ");

    if (validModels.includes(args[0].toLowerCase()) && args.length > 1) {
        model = args[0].toLowerCase();
        message = args.slice(1).join(" ");
    }

    api.sendTypingIndicator(true, event.sender.id);

    try {
        const apiUrl = "https://shin-apis.onrender.com/ai/copilot";
        const response = await axios.get(apiUrl, {
            params: { message: message, model: model }
        });

        const data = response.data;
        const reply = data.result || data.response || data.answer || data.message;

        if (reply) {
            const finalMessage = `🟦 **Microsoft Copilot** (${model})\n━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━`;
            api.sendMessage(finalMessage, event.sender.id);
        } else {
            api.sendMessage("❌ Empty response.", event.sender.id);
        }

    } catch (error) {
        api.sendMessage("❌ An error occurred while contacting Copilot.", event.sender.id);
    } finally {
        api.sendTypingIndicator(false, event.sender.id);
    }
};
