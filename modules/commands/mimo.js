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
    
    const visionKey = OPENROUTER2_KEY || OPENROUTER_KEY; 
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, sid);

    let userHistory = await db.getHistory(sid);

    const analyzeMedia = async () => {
        if (!attachment) return null;
        try {
            const mediaUrl = attachment.payload.url;
            const contentPayload = [{ type: "text", text: "Analyze this media carefully." }];
            if (attachment.type === "video") contentPayload.push({ type: "video_url", video_url: { url: mediaUrl } });
            else contentPayload.push({ type: "image_url", image_url: { url: mediaUrl } });

            const res = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
                model: "allenai/molmo-2-8b:free",
                messages: [{ role: "user", content: contentPayload }],
                temperature: 0.2,
                max_tokens: 500
            }, { headers: { "Authorization": `Bearer ${visionKey}`, "Content-Type": "application/json" } });
            return res.data?.choices?.[0]?.message?.content || null;
        } catch (e) { return null; }
    };

    const performWebSearch = async () => {
        if (!query || /remember|last|conversation/i.test(query)) return null; 
        try {
            const googleRes = await axios.get("https://www.googleapis.com/customsearch/v1", {
                params: { key: GOOGLE_API_KEY, cx: GOOGLE_CX, q: query, num: 4 }
            });
            if (!googleRes.data.items) return null;
            const results = await Promise.all(googleRes.data.items.slice(0, 3).map(async (item) => {
                let fullText = "";
                try {
                    const r = await axios.get(`https://r.jina.ai/${item.link}`, { headers: JINA_API_KEY ? { 'Authorization': `Bearer ${JINA_API_KEY}` } : {} });
                    fullText = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
                } catch (e) {}
                return `SOURCE: ${item.title}\nCONTEXT: ${item.snippet}\nCONTENT: ${fullText.substring(0, 1800)}\n---`;
            }));
            return results.join("\n");
        } catch (e) { return null; }
    };

    try {
        const [visionResult, searchResult] = await Promise.all([analyzeMedia(), performWebSearch()]);
        let finalContext = "";
        if (visionResult) finalContext += `\n[VISUAL CONTEXT]:\n${visionResult}\n`;
        if (searchResult) finalContext += `\n[WEB SEARCH RESULTS]:\n${searchResult}\n`;

        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            model: "xiaomi/mimo-v2-flash:free",
            messages: [{ role: "system", content: "You are Mimo V2." }, ...userHistory, { role: "user", content: query ? query + "\n" + finalContext : finalContext }],
            temperature: 0.5, 
            max_tokens: 1500
        }, { headers: { "Authorization": `Bearer ${OPENROUTER_KEY}`, "Content-Type": "application/json" } });

        const answer = response.data?.choices?.[0]?.message?.content?.trim();
        if (answer) {
            reply(`🐱 **Mimo V2 Flash**\n────────────────\n${answer}`);
            userHistory.push({ role: "user", content: query || "media" }, { role: "assistant", content: answer });
            await db.setHistory(sid, userHistory.slice(-16));
        }
    } catch (error) {
        reply("my brain's lagging.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, sid);
    }
};
