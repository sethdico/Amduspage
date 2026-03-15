const { http } = require("../utils");

module.exports.config = {
    name: "xdash",
    author: "sethdico",
    category: "AI",
    description: "web search with ai.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const senderID = event.sender.id;
    const query = args.join(" ");

    if (!query) {
        return reply("🔎 **xdash**\n━━━━━━━━━━━━━━━━\nhow to use:\n  xdash <query>\n\nexample:\n  xdash best anime 2026");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

    try {
        const res = await http.get("https://haji-mix-api.gleeze.com/api/xdash", {
            params: { ask: query, stream: false }
        });

        const data = res.data.answer;
        if (!data || !data.llm_response) return reply("couldn't find anything.");

        const clean = data.llm_response
            .replace(/【citation:\d+】/g, "")
            .replace(/```mermaid[\s\S]*?```/g, "")
            .replace(/---\n\n### Timeline \(Mermaid\)/g, "")
            .replace(/\n---\n\n\*\*Assumptions\*\*[\s\S]*?$/g, "")
            .trim();

        await api.sendMessage(`🔎 **xdash**\n\n${clean}`.toLowerCase(), senderID);

        if (data.results?.length > 0) {
            const sources = data.results.slice(0, 6).map(item => ({
                title: item.name.substring(0, 80),
                subtitle: item.snippet.substring(0, 80),
                image_url: "https://files.catbox.moe/5688j6.png",
                buttons: [{ type: "web_url", url: item.url, title: "view source" }]
            }));
            
            await api.sendCarousel(sources, senderID);
        }

    } catch (e) {
        reply("search tools are down.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
