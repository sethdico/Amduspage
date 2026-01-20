const axios = require("axios");

const chatHistory = new Map();

module.exports.config = {
    name: "mimo",
    author: "Sethdico",
    version: "2.1",
    category: "AI",
    description: "Mimo V2 flash with google api and fake memory",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const query = args.join(" ").trim();
    const sid = event.threadID || event.sender.id;

    if (!query) return reply("Hey, what's on your mind?");
    
    if (query.toLowerCase() === "clear" || query.toLowerCase() === "reset") {
        chatHistory.delete(sid);
        return reply("Memory wiped. Starting fresh.");
    }

    const { OPENROUTER_KEY, GOOGLE_API_KEY, GOOGLE_CX } = process.env;

    if (!OPENROUTER_KEY) return reply("API key missing in environment variables.");

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, sid);

    let userHistory = chatHistory.get(sid) || [];

    const isMetaQuestion = /what.*(said|talk|conversation|discussed|last)/i.test(query);
    let searchContext = "";

    try {
        if (GOOGLE_API_KEY && GOOGLE_CX && !isMetaQuestion) {
            const searchRes = await axios.get("https://www.googleapis.com/customsearch/v1", {
                params: { key: GOOGLE_API_KEY, cx: GOOGLE_CX, q: query, num: 3 },
                timeout: 5000 
            });
            
            if (searchRes.data.items?.length > 0) {
                const results = searchRes.data.items
                    .map(item => `• ${item.title}: ${item.snippet}`)
                    .join("\n");
                
                searchContext = `\n\n[WEB SEARCH RESULTS]:\n${results}\n(Use these to answer if relevant)`;
            }
        }
    } catch (e) {
        console.warn("Mimo Search Error:", e.message); 
    }

    const systemPrompt = {
        role: "system",
        content: "You are Mimo, a chill and helpful AI assistant. You have access to conversation history and real-time web search results. " + 
                 "If the user asks a question requiring facts, use the [WEB SEARCH RESULTS]. " + 
                 "If the user asks about the conversation, use the history. Keep answers concise and casual."
    };

    try {
        const messages = [
            systemPrompt,
            ...userHistory, 
            { role: "user", content: query + searchContext }
        ];

        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "xiaomi/mimo-v2-flash:free",
                messages: messages,
                temperature: 0.7,
                max_tokens: 800
            },
            {
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://github.com/sethdico",
                    "X-Title": "Mimo AI"
                },
                timeout: 25000
            }
        );

        const answer = response.data?.choices?.[0]?.message?.content?.trim();
        
        if (answer) {
            reply(answer);

            userHistory.push({ role: "user", content: query });
            userHistory.push({ role: "assistant", content: answer });

            if (userHistory.length > 10) {
                userHistory = userHistory.slice(userHistory.length - 10);
            }
            
            chatHistory.set(sid, userHistory);

        } else {
            reply("I processed that, but came back empty. Try again?");
        }

    } catch (error) {
        console.error("Mimo Logic Error:", error.response?.data || error.message);
        
        if (error.code === 'ECONNABORTED') return reply("I timed out. The network is slow.");
        if (error.response?.status === 429) return reply("Too many requests. Give me a sec.");
        
        reply("Brain freeze. Something went wrong.");

    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, sid);
    }
};
