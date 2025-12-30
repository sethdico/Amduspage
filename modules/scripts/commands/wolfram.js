const { http } = require("../../utils");

module.exports.config = {
    name: "wolfram",
    author: "Sethdico",
    version: "5.0",
    category: "Utility",
    description: "Solve math/science with cross-search.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const input = args.join(" ");
    const id = event.sender.id;

    if (!input) return reply("🧮 Usage: wolfram <query>");
    
    api.sendTypingIndicator(true, id);

    try {
        const response = await http.get(`https://api.wolframalpha.com/v2/query`, {
            params: {
                appid: process.env.WOLFRAM_APP_ID,
                input: input,
                output: "json",
                format: "plaintext,image",
            }
        });

        const res = response.data.queryresult;
        if (!res.success) return reply("❌ Wolfram couldn't solve that.");

        let resultText = "";
        let pods = res.pods || [];
        
        for (const pod of pods.slice(0, 3)) {
            resultText += `📍 **${pod.title}**\n${pod.subpods[0].plaintext}\n\n`;
        }

        const msg = `🧮 **WOLFRAM RESULT**\n━━━━━━━━━━━━━━━━\n${resultText.trim()}`;
        await api.sendMessage(msg, id);

        // Flow: Offer to search the same thing elsewhere if it's too complex
        const flows = ["Wiki", "Google", "Help"];
        return api.sendQuickReply("💡 Still confused? Try searching here:", flows, id);

    } catch (e) {
        reply("❌ Wolfram is currently unavailable.");
    } finally {
        api.sendTypingIndicator(false, id);
    }
};
