const axios = require("axios");

const chatHistory = new Map();

module.exports.config = {
    name: "mimo",
    author: "Sethdico",
    version: "7.0",
    category: "AI",
    description: "Mimo V2: Multimodal Agent (Vision + Search + Reasoning)",
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
        return reply("Conversation memory has been cleared.");
    }

    const { OPENROUTER_KEY, OPENROUTER2_KEY, GOOGLE_API_KEY, GOOGLE_CX, JINA_API_KEY } = process.env;

    if (!OPENROUTER_KEY) return reply("Configuration Error: OPENROUTER_KEY (Mimo) is missing.");
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
                { type: "text", text: "Describe this media in extreme detail. Identify objects, text, people, location, and context." }
            ];

            if (isVideo) {
                contentPayload.push({ type: "video_url", video_url: { url: mediaUrl } });
            } else {
                contentPayload.push({ type: "image_url", image_url: { url: mediaUrl } });
            }

            const res = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
                model: "allenai/molmo-2-8b:free",
                messages: [{ role: "user", content: contentPayload }],
                temperature: 0.2,
                max_tokens: 500
            }, {
                headers: { 
                    "Authorization": `Bearer ${visionKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://github.com/sethdico",
                    "X-Title": "Mimo Vision"
                },
                timeout: 30000 
            });

            return res.data?.choices?.[0]?.message?.content || null;
        } catch (e) {
            console.warn("Vision Analysis Failed:", e.message);
            return null; 
        }
    };

    const performWebSearch = async () => {
        if (/what.*(we|i|said|talk|conversation|discussed|last|previous|remember)/i.test(query)) return null;
        if (!query) return null; 

        try {
            const googleRes = await axios.get("https://www.googleapis.com/customsearch/v1", {
                params: { key: GOOGLE_API_KEY, cx: GOOGLE_CX, q: query, num: 3 },
                timeout: 8000
            });

            if (!googleRes.data.items || googleRes.data.items.length === 0) return null;

            const topLinks = googleRes.data.items.slice(0, 2).map(item => item.link);
            const scrapePromises = topLinks.map(link => 
                axios.get(`https://r.jina.ai/${link}`, {
                    timeout: 15000,
                    headers: JINA_API_KEY ? { 'Authorization': `Bearer ${JINA_API_KEY}` } : {}
                }).catch(() => null)
            );

            const scrapedResults = await Promise.all(scrapePromises);

            const combinedContent = scrapedResults
                .filter(res => res && res.data)
                .map(res => {
                    const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
                    return text.substring(0, 1500); 
                })
                .join("\n\n---\n\n");

            return combinedContent ? combinedContent : null;

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
        
        if (visionResult) {
            finalContext += `\n[VISUAL CONTEXT (What the user sent)]:\n${visionResult}\n`;
        }
        
        if (searchResult) {
            finalContext += `\n[WEB SEARCH RESULTS]:\n${searchResult}\n`;
        }

        const now = new Date();
        const dateString = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const systemPrompt = {
            role: "system",
            content: `You are Mimo V2, an intelligent multimodal assistant by Xiaomi.
            Date: ${dateString}.

            Capabilities:
            1. VISUAL: You can see images/videos via the [VISUAL CONTEXT] block. Use this to answer questions about attachments.
            2. SEARCH: You have access to [WEB SEARCH RESULTS]. Use this for facts, news, and data.
            3. MEMORY: You remember the chat history.

            Guidelines:
            - Be helpful, accurate, and detailed.
            - Synthesize the Visual Context and Web Results to answer the user.
            - If the Visual Context describes an object, and the user asks for details not in the image, use the Web Results or your knowledge.
            - Do not mention internal tool names (like "Molmo" or "Jina"). Just act like you can see and search.`
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
                temperature: 0.6,
                max_tokens: 1200,
                top_p: 1
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

            const historyContent = query + (visionResult ? ` (User sent image: ${visionResult.substring(0, 100)}...)` : "");
            
            userHistory.push({ role: "user", content: historyContent });
            userHistory.push({ role: "assistant", content: answer });

            if (userHistory.length > 16) userHistory = userHistory.slice(userHistory.length - 16);
            chatHistory.set(sid, userHistory);

        } else {
            reply("I'm having trouble processing that request. Please try again.");
        }

    } catch (error) {
        console.error("Mimo Orchestrator Error:", error.message);
        reply("An internal error occurred while processing your request.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, sid);
    }
};
