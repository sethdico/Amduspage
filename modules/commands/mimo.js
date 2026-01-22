const axios = require("axios");

const chatHistory = new Map();

module.exports.config = {
    name: "mimo",
    author: "Sethdico",
    version: "8.0",
    category: "AI",
    description: "Mimo V2: Multimodal Agent (Vision + Search + Reasoning)",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const query = args.join(" ").trim();
    const sid = event.threadID || event.sender.id;
    
    // 1. Get Attachments (Images/Videos)
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

    if (!OPENROUTER_KEY) return reply("Configuration Error: OPENROUTER_KEY is missing.");
    if (!GOOGLE_API_KEY || !GOOGLE_CX) return reply("Configuration Error: Google Search keys are missing.");
    
    const visionKey = OPENROUTER2_KEY || OPENROUTER_KEY; 

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, sid);

    let userHistory = chatHistory.get(sid) || [];

    // --- MODULE 1: VISION (Molmo) ---
    const analyzeMedia = async () => {
        if (!attachment) return null;
        try {
            const mediaUrl = attachment.payload.url;
            const isVideo = attachment.type === "video";
            const contentPayload = [
                { type: "text", text: "Describe this media in extreme detail. Identify objects, text, people, timestamps, and context." }
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

    // --- MODULE 2: DEEP SEARCH (Google + Jina) ---
    const performWebSearch = async () => {
        // Skip search for personal memory questions
        if (/what.*(we|i|said|talk|conversation|discussed|last|previous|remember)/i.test(query)) return null;
        if (!query) return null; 

        try {
            // Search Google (Top 4 results)
            const googleRes = await axios.get("https://www.googleapis.com/customsearch/v1", {
                params: { key: GOOGLE_API_KEY, cx: GOOGLE_CX, q: query, num: 4, gl: "ph" }, // gl: ph ensures results relevant to user's region
                timeout: 10000
            });

            if (!googleRes.data.items || googleRes.data.items.length === 0) return null;

            // Map the Google Results first (Snippet Fallback)
            const searchItems = googleRes.data.items;
            
            // Read the Top 3 links in parallel
            const scrapePromises = searchItems.slice(0, 3).map(async (item) => {
                let fullText = "";
                try {
                    const r = await axios.get(`https://r.jina.ai/${item.link}`, {
                        timeout: 15000,
                        headers: JINA_API_KEY ? { 'Authorization': `Bearer ${JINA_API_KEY}` } : {}
                    });
                    if (r.data) fullText = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
                } catch (e) {
                    // If Jina fails, we keep fullText empty and rely on the Google Snippet
                }

                return `
SOURCE: ${item.title}
LINK: ${item.link}
GOOGLE SNIPPET: ${item.snippet}
FULL CONTENT: ${fullText.substring(0, 2000)}
--------------------------------------------------`;
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

        // Get accurate date info
        const now = new Date();
        const dateString = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        const systemPrompt = {
            role: "system",
            content: `You are Mimo V2.
            
            IMPORTANT CONTEXT:
            - Current Date: ${dateString}, ${timeString}.
            - User Location: Philippines.
            - Your internal training data is OUTDATED.
            
            INSTRUCTIONS:
            1. TRUST THE [WEB SEARCH RESULTS] ABOVE ALL ELSE. If the search results say something is released in 2026, believe it, even if your internal data says "TBA".
            2. If [WEB SEARCH RESULTS] are present, base your answer entirely on them.
            3. If the user sent an image, use [VISUAL CONTEXT].
            4. Keep the tone helpful, human, and direct. Do not sound robotic.`
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
                temperature: 0.4, // Lower temperature = More factual/Less hallucination
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
