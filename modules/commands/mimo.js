const axios = require("axios");
const db = require("../core/database");

module.exports.config = {
    name: "mimo",
    author: "Sethdico",
    version: "12.0",
    category: "AI",
    description: "Mimo V2: Vision + Persistent Memory + Critical Reasoning",
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

    if (!query && !attachment) return reply("whats up?");

    if (["clear", "reset", "forget"].includes(query.toLowerCase())) {
        await db.clearHistory(sid);
        return reply("memory wiped.");
    }

    const { OPENROUTER_KEY, OPENROUTER2_KEY, GOOGLE_API_KEY, GOOGLE_CX, JINA_API_KEY } = process.env;

    if (!OPENROUTER_KEY) return reply("missing openrouter key.");
    if (!GOOGLE_API_KEY || !GOOGLE_CX) return reply("missing search keys.");
    
    const visionKey = OPENROUTER2_KEY || OPENROUTER_KEY; 

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, sid);

    let userHistory = await db.getHistory(sid);

    const analyzeMedia = async () => {
        if (!attachment) return null;
        try {
            const mediaUrl = attachment.payload.url;
            const isVideo = attachment.type === "video";
            const contentPayload = [
                { type: "text", text: "Analyze this media carefully. Describe the scene, text on screen, objects, and any visible dates." }
            ];
            if (isVideo) contentPayload.push({ type: "video_url", video_url: { url: mediaUrl } });
            else contentPayload.push({ type: "image_url", image_url: { url: mediaUrl } });

            const res = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
                model: "allenai/molmo-2-8b:free",
                messages: [{ role: "user", content: contentPayload }],
                temperature: 0.2,
                max_tokens: 500
            }, {
                headers: { "Authorization": `Bearer ${visionKey}`, "Content-Type": "application/json" },
                timeout: 30000 
            });
            return res.data?.choices?.[0]?.message?.content || null;
        } catch (e) { return null; }
    };

    const performWebSearch = async () => {
        if (/what.*(we|i|said|talk|conversation|discussed|last|previous|remember)/i.test(query)) return null;
        if (!query) return null; 

        try {
            const googleRes = await axios.get("https://www.googleapis.com/customsearch/v1", {
                params: { key: GOOGLE_API_KEY, cx: GOOGLE_CX, q: query, num: 4 }, 
                timeout: 10000
            });

            if (!googleRes.data.items) return null;

            const scrapePromises = googleRes.data.items.slice(0, 3).map(async (item) => {
                let fullText = "";
                try {
                    const r = await axios.get(`https://r.jina.ai/${item.link}`, {
                        timeout: 12000,
                        headers: JINA_API_KEY ? { 'Authorization': `Bearer ${JINA_API_KEY}` } : {}
                    });
                    if (r.data) fullText = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
                } catch (e) {}

                return `SOURCE: ${item.title}\nLINK: ${item.link}\nCONTEXT: ${item.snippet}\nCONTENT: ${fullText.substring(0, 1800)}\n---`;
            });

            const results = await Promise.all(scrapePromises);
            return results.join("\n");
        } catch (e) { return null; }
    };

    try {
        const [visionResult, searchResult] = await Promise.all([analyzeMedia(), performWebSearch()]);

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
            content: `You are Mimo V2 by Xiaomi.
            Time: ${fullDateString}.
            
            REASONING RULES:
            1. EVALUATE: [WEB SEARCH RESULTS] may contain scams or errors. If a result says "Free Money" or contradicts basic logic, reject it and use internal knowledge to warn the user.
            2. TEMPORAL MATH: Always calculate the difference between "Time Anchor" and dates found online. (e.g., If a premiere was 2 weeks ago, calculate current episode count).
            3. SYNTHESIS: Combine training data (coding/logic) with Web data (news/prices) for a complete answer.
            4. TONE: Low-key, human, nonchalant. No robotic fluff.
            5. VISUALS: Use [VISUAL CONTEXT] to describe what you "see" in the user's attachment.
            
            If search results are empty and you don't know the answer, just say "i don't have info on that yet" instead of lying.`
        };

        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "xiaomi/mimo-v2-flash:free",
                messages: [systemPrompt, ...userHistory, { role: "user", content: query ? query + "\n" + finalContext : finalContext }],
                temperature: 0.5, 
                max_tokens: 1500
            },
            {
                headers: { "Authorization": `Bearer ${OPENROUTER_KEY}`, "Content-Type": "application/json" },
                timeout: 60000
            }
        );

        const answer = response.data?.choices?.[0]?.message?.content?.trim();
        
        if (answer) {
            reply(answer);
            const historyContent = query + (visionResult ? " (User sent media)" : "");
            userHistory.push({ role: "user", content: historyContent });
            userHistory.push({ role: "assistant", content: answer });
            if (userHistory.length > 16) userHistory = userHistory.slice(-16);
            await db.setHistory(sid, userHistory);
        } else {
            reply("i blanked out. try again.");
        }
    } catch (error) {
        reply("my brain's lagging. try later.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, sid);
    }
};
