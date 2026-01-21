const axios = require("axios");

const chatHistory = new Map();

module.exports.config = {
    name: "mimo",
    author: "Sethdico",
    version: "3.0",
    category: "AI",
    description: "Mimo V2 Flash (Xiaomi) with Context Awareness",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const query = args.join(" ").trim();
    const sid = event.threadID || event.sender.id;

    if (!query) return reply("Hello! I am Mimo V2 Flash by Xiaomi. How can I help you?");

    if (query.toLowerCase() === "clear" || query.toLowerCase() === "reset") {
        chatHistory.delete(sid);
        return reply("🔄 Context memory cleared. Starting fresh.");
    }

    const { OPENROUTER_KEY, GOOGLE_API_KEY, GOOGLE_CX } = process.env;

    if (!OPENROUTER_KEY) return reply("⚠️ System Error: OPENROUTER_KEY is missing.");

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, sid);

    let userHistory = chatHistory.get(sid) || [];

    const isMetaQuestion = /what.*(we|said|talk|conversation|discussed|last|previous)/i.test(query);
    let googleContext = "";

    try {
        if (GOOGLE_API_KEY && GOOGLE_CX && !isMetaQuestion) {
            const searchRes = await axios.get("https://www.googleapis.com/customsearch/v1", {
                params: { 
                    key: GOOGLE_API_KEY, 
                    cx: GOOGLE_CX, 
                    q: query, 
                    num: 4 
                },
                timeout: 6000 
            });
            
            if (searchRes.data.items?.length > 0) {
                const rawResults = searchRes.data.items.map((item, index) => {
                    return `[Source ${index + 1}]: ${item.title}\nURL: ${item.link}\nSummary: ${item.snippet}`;
                }).join("\n\n");

                googleContext = `\n<search_results>\nThe user is asking: "${query}". Here is real-time data from Google:\n\n${rawResults}\n\nINSTRUCTIONS: Use this data to answer accurately. Include the URL if the summary is insufficient.\n</search_results>`;
            }
        }
    } catch (e) {
        console.warn("Search Module Error:", e.message);
    }

    const now = new Date();
    const dateString = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const systemPrompt = {
        role: "system",
        content: `You are Mimo V2 Flash, an advanced AI assistant developed by Xiaomi. 
        
        Your Identity:
        - You are witty, helpful, and highly intelligent.
        - You allow for natural conversation while providing factual data.
        - You are aware that the current date is ${dateString} at ${timeString}.
        
        Rules:
        1. Context Awareness: Distinguish clearly between the User's Message and the <search_results> data.
        2. Web Data: If search results are provided, use them to answer factual questions. If the snippet is too short, provide the Source URL.
        3. Memory: Use the conversation history to answer questions about previous topics.
        4. Tone: Keep it human-like, casual, and concise.`
    };

    try {
        const currentMessage = {
            role: "user",
            content: googleContext ? `${query}\n${googleContext}` : query
        };

        const messages = [
            systemPrompt,
            ...userHistory,
            currentMessage
        ];

        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "xiaomi/mimo-v2-flash:free",
                messages: messages,
                temperature: 0.7,
                max_tokens: 1200,
                top_p: 0.9
            },
            {
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://xiaomi.com",
                    "X-Title": "Mimo V2 Flash"
                },
                timeout: 40000
            }
        );

        const answer = response.data?.choices?.[0]?.message?.content?.trim();
        
        if (answer) {
            reply(answer);

            userHistory.push({ role: "user", content: query });
            userHistory.push({ role: "assistant", content: answer });

            if (userHistory.length > 12) {
                userHistory = userHistory.slice(userHistory.length - 12);
            }
            
            chatHistory.set(sid, userHistory);

        } else {
            reply("I'm having trouble connecting to the neural network. Please try again.");
        }

    } catch (error) {
        console.error("Mimo System Error:", error.response?.data || error.message);
        
        let errorMsg = "An internal error occurred.";
        if (error.code === 'ECONNABORTED') errorMsg = "The request timed out. My servers are busy.";
        if (error.response?.status === 429) errorMsg = "Too many requests. Please slow down.";
        if (error.response?.status === 401) errorMsg = "Authentication failed. Check API keys.";
        
        reply(errorMsg);

    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, sid);
    }
};
