const axios = require("axios");

const chatHistory = new Map();

module.exports.config = {
    name: "mimo",
    author: "Sethdico",
    version: "11.0", 
    category: "AI",
    description: "Mimo V2: Vision + Search + Critical Thinking",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const query = args.join(" ").trim();
    const sid = event.threadID || event.sender.id;
    
    const getAttachment = (msg) => {
        if (!msg || !msg.attachments) return null;
        return msg.attachments.find(a => a.type === "image" || a.type === "video");
    };
    const attachment = getAttachment(event.message) || getAttachment(event.message?.reply_to);

    if (!query && !attachment) return reply("Hello! Send a message or an image, and I'll help you.");

    if (["clear", "reset", "forget"].includes(query.toLowerCase())) {
        chatHistory.delete(sid);
        return reply("Context memory cleared.");
    }

    const { OPENROUTER_KEY, OPENROUTER2_KEY, GOOGLE_API_KEY, GOOGLE_CX, JINA_API_KEY } = process.env;

    if (!OPENROUTER_KEY) return reply("Configuration Error: OPENROUTER_KEY is missing.");
    if (!GOOGLE_API_KEY || !GOOGLE_CX) return reply("Configuration Error: Google Search keys are missing.");
    
    const visionKey = OPENROUTER2_KEY || OPENROUTER_KEY; 

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, sid);

    let userHistory = chatHistory.get(sid) || [];

    const analyzeMedia = async () => {
        if (!attachment) return null;
        try {
            const mediaUrl = attachment.payload.url;
            const isVideo = attachment.type === "video";
            const contentPayload = [
                { type: "text", text: "Analyze this media carefully. Describe the scene, text on screen, objects, people, and any visible dates or timestamps." }
            ];
            if (isVideo) contentPayload.push({ type: "video_url", video_url: { url: mediaUrl } });
            else contentPayload.push({ type: "image_url", image_url: { url: mediaUrl } });

            const res = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
                model: "allenai/molmo-2-8b:free",
                messages: [{ role: "user", content: contentPayload }],
                temperature: 0.2,
                max_tokens: 500
            }, {
                headers: { 
                    "Authorization": `Bearer ${visionKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://github.com/sethdico"
                },
                timeout: 30000 
            });
            return res.data?.choices?.[0]?.message?.content || null;
        } catch (e) {
            return null; 
        }
    };

    const performWebSearch = async () => {
        if (/what.*(we|i|said|talk|conversation|discussed|last|previous|remember)/i.test(query)) return null;
        if (!query) return null; 

        try {
            const googleRes = await axios.get("https://www.googleapis.com/customsearch/v1", {
                params: { key: GOOGLE_API_KEY, cx: GOOGLE_CX, q: query, num: 4 }, 
                timeout: 10000
            });

            if (!googleRes.data.items || googleRes.data.items.length === 0) return null;

            const searchItems = googleRes.data.items;
            
            const scrapePromises = searchItems.slice(0, 3).map(async (item) => {
                let fullText = "";
                try {
                    const r = await axios.get(`https://r.jina.ai/${item.link}`, {
                        timeout: 15000,
                        headers: JINA_API_KEY ? { 'Authorization': `Bearer ${JINA_API_KEY}` } : {}
                    });
                    if (r.data) fullText = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
                } catch (e) {}

                return `
SOURCE: ${item.title}
LINK: ${item.link}
PUBLISHED: ${item.snippet}
CONTENT: ${fullText.substring(0, 2000)}
---`;
            });

            const results = await Promise.all(scrapePromises);
            return results.join("\n");

        } catch (e) {
            console.warn("Web Search Failed:", e.message);
            return null;
        }
    };

    try {
        const [visionResult, searchResult] = await Promise.all([
            analyzeMedia(),
            performWebSearch()
        ]);

        let finalContext = "";
        if (visionResult) finalContext += `\n[VISUAL CONTEXT]:\n${visionResult}\n`;
        if (searchResult) finalContext += `\n[WEB SEARCH RESULTS]:\n${searchResult}\n`;

        const now = new Date();
        const fullDateString = now.toLocaleString('en-US', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZoneName: 'short' 
        });

        const systemPrompt = {
            role: "system",
            content: `You are Mimo V2, an intelligent assistant by Xiaomi.
            
            GLOBAL TIME ANCHOR: ${fullDateString}.
            
            CORE LOGIC & REASONING:
            1. CREDIBILITY CHECK (CRITICAL):
               - Do not blindly trust [WEB SEARCH RESULTS]. Evaluate them first.
               - If the Search Results look like scams (e.g., "Free Money," "Download RAM"), logically reject them using your Internal Knowledge and warn the user.
               - If Search Results contradict basic science or logic (e.g., "The moon is made of cheese"), verify against your Internal Knowledge and correct it.
            
            2. TEMPORAL SYNTHESIS:
               - Compare dates in the text with "GLOBAL TIME ANCHOR".
               - Example: If text says "Coming 2025" and today is 2026, treat it as released/past.
            
            3. KNOWLEDGE MERGER:
               - Use [WEB SEARCH RESULTS] for: Recent news, prices, release dates, weather, current leaders.
               - Use [INTERNAL KNOWLEDGE] for: General facts, safety, coding, definitions, and logic.
               - Use [VISUAL CONTEXT] for: Answering questions about the attached image.
            
            4. PERSONA:
               - Helpful, smart, straightforward and direct.
               - If sources conflict, state: "Sources are conflicting, but..."
               - If something is an obvious hoax found online, debunk it.`
        };

        const messages = [
            systemPrompt,
            ...userHistory,
            { role: "user", content: query ? query + "\n" + finalContext : finalContext }
        ];

        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "xiaomi/mimo-v2-flash:free",
                messages: messages,
                temperature: 0.5, 
                max_tokens: 1500,
                top_p: 0.9
            },
            {
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://xiaomi.com",
                    "X-Title": "Mimo V2"
                },
                timeout: 60000
            }
        );

        const answer = response.data?.choices?.[0]?.message?.content?.trim();
        
        if (answer) {
            reply(answer);

            const historyContent = query + (visionResult ? " (User sent an image)" : "");
            
            userHistory.push({ role: "user", content: historyContent });
            userHistory.push({ role: "assistant", content: answer });

            if (userHistory.length > 16) userHistory = userHistory.slice(userHistory.length - 16);
            chatHistory.set(sid, userHistory);

        } else {
            reply("I'm having trouble connecting to the network. Please try again.");
        }

    } catch (error) {
        console.error("Mimo Error:", error.message);
        reply("An internal error occurred.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, sid);
    }
};
