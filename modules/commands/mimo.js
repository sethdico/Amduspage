const axios = require("axios");

module.exports.config = {
    name: "mimo",
    author: "Sethdico",
    version: "2.0",
    category: "AI",
    description: "Xiaomi Mimo V2 Flash with Internet Search",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const query = args.join(" ").trim();
    
    if (!query) return reply("what do you wanna know?");

    const OPENROUTER_KEY = process.env.OPENROUTER_KEY || "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";
    const googleApiKey = process.env.GOOGLE_API_KEY;
    const googleCx = process.env.GOOGLE_CX;

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id);

    let context = "";

    try {
        if (googleApiKey && googleCx) {
            const searchRes = await axios.get("https://www.googleapis.com/customsearch/v1", {
                params: { key: googleApiKey, cx: googleCx, q: query, num: 5 },
                timeout: 8000
            });
            
            if (searchRes.data.items?.length > 0) {
                const results = searchRes.data.items.slice(0, 3)
                    .map(item => `${item.title}\n${item.snippet}`)
                    .join("\n\n");
                context = `search results:\n${results}\n\n`;
            }
        }
    } catch (e) {
        console.log("search failed:", e.message);
    }

    const systemPrompt = "you're a chill assistant. if there's search results, use them. keep it casual and helpful.";

    try {
        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "xiaomi/mimo-v2-flash:free",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: context + query }
                ],
                temperature: 0.7,
                max_tokens: 1000
            },
            {
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://github.com/sethdico/Amduspage"
                },
                timeout: 30000
            }
        );

        const answer = response.data?.choices?.[0]?.message?.content?.trim();
        
        if (answer) {
            reply(answer);
        } else {
            reply("got nothing back, try again?");
        }

    } catch (error) {
        console.log("mimo error:", error.response?.status || error.message);

        let msg = "couldn't get a response";
        
        if (error.code === 'ECONNABORTED') msg = "took too long, try again";
        else if (error.response?.status === 429) msg = "too many requests, wait a sec";
        else if (error.response?.status === 401) msg = "api key issue";
        
        reply(msg);

    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, event.sender.id);
    }
};
