const axios = require("axios");

module.exports.config = {
    name: "mimo",
    author: "Sethdico",
    version: "1.0",
    category: "AI",
    description: "Xiaomi Mimo V2 Flash with Internet Search",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const query = args.join(" ");
    if (!query) return reply("what do you want to search?");

    const OPENROUTER_KEY = "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";
    const googleApiKey = process.env.GOOGLE_API_KEY;
    const googleCx = process.env.GOOGLE_CX;

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id);

    let context = "";

    try {
        if (googleApiKey && googleCx) {
            const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleCx}&q=${encodeURIComponent(query)}`;
            const searchRes = await axios.get(searchUrl);
            
            if (searchRes.data.items && searchRes.data.items.length > 0) {
                const snippets = searchRes.data.items.slice(0, 3).map(item => item.snippet).join("\n");
                context = `Web Search Results:\n${snippets}\n\n`;
            }
        }
    } catch (e) {
        
    }

    const systemPrompt = "You are a helpful assistant. If web search results are provided, use them to answer the user's question accurately. If not, answer to the best of your ability. Keep the tone casual and human-like.";

    try {
        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            model: "xiaomi/mimo-v2-flash:free",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: context + "User Query: " + query }
            ],
            stream: false
        }, {
            headers: {
                "Authorization": `Bearer ${OPENROUTER_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com/sethdico/Amduspage"
            }
        });

        const replyText = response.data.choices[0].message.content;
        
        reply(replyText);

    } catch (error) {
        console.error("Mimo Error:", error.response?.data || error.message);
        reply("error connecting to mimo ai");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, event.sender.id);
    }
};
