const axios = require("axios");
const { http } = require("../utils");

const processed = new Set();
setInterval(() => processed.clear(), 60000);

module.exports.config = {
    name: "molmo",
    author: "sethdico",
    version: "11.0",
    category: "AI",
    description: "vision reasoning agent. molmo sees, exa searches, molmo synthesizes.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const mid = event.message?.mid;
    if (mid && processed.has(mid)) return;
    if (mid) processed.add(mid);

    const prompt = args.join(" ").trim();
    const id = event.sender.id;
    const vKey = process.env.OPENROUTER2_KEY;
    const eKey = process.env.EXA_API_KEY;

    if (!vKey || !eKey) return reply("keys missing.");

    const att = event.message?.reply_to?.attachments?.find(a => ["image", "video"].includes(a.type)) || 
                event.message?.attachments?.find(a => ["image", "video"].includes(a.type));

    if (!prompt && !att) return reply("provide media or a query.");
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, id);

    try {
        let vision = "no media.";
        if (att) {
            const url = att.payload.url;
            const content = [
                { type: "text", text: "identify this media and describe details for a search engine query." },
                att.type === "video" ? { type: "text", text: `video link: ${url}` } : { type: "image_url", image_url: { url } }
            ];

            const vRes = await http.post("https://openrouter.ai/api/v1/chat/completions", {
                model: "allenai/molmo-2-8b:free",
                messages: [{ role: "user", content }]
            }, { headers: { "Authorization": `Bearer ${vKey}` } });

            vision = vRes.data?.choices?.[0]?.message?.content || "";
        }

        const query = `${prompt} ${vision}`.substring(0, 200);
        const eRes = await axios.post("https://api.exa.ai/search", {
            query: query,
            numResults: 3,
            useAutoprompt: true,
            contents: { text: { maxCharacters: 800 } }
        }, { headers: { "x-api-key": eKey, "Content-Type": "application/json" } });

        const results = eRes.data.results || [];
        const search = results.map(r => `title: ${r.title}\ncontent: ${r.text}`).join("\n\n") || "no data.";
        const sources = results.map(r => `- ${r.title}: ${r.url}`).join("\n");

        const finalPrompt = `
            persona: you are Molmo. rational, nonchalant, lowercase only.
            context: ${vision}
            web_data: ${search}
            query: ${prompt || "analyze this."}
            task: answer based on context and web data. be precise.
        `;

        const res = await http.post("https://openrouter.ai/api/v1/chat/completions", {
            model: "allenai/molmo-2-8b:free",
            messages: [{ role: "user", content: [{ type: "text", text: finalPrompt }] }]
        }, { headers: { "Authorization": `Bearer ${vKey}` } });

        const answer = res.data?.choices?.[0]?.message?.content || vision;
        const output = `👁️ **molmo x exa**\n────────────────\n${answer}${sources ? `\n\nsources:\n${sources}` : ""}`;

        reply(output.toLowerCase());

    } catch (e) {
        reply("system error.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, id);
    }
};
