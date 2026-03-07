const { http } = require("../utils");

module.exports.config = {
    name: "xdash",
    author: "sethdico",
    version: "1.0",
    category: "AI",
    description: "Search the web with Xdash AI",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const query = args.join(" ");
    const senderID = event.sender.id;

    if (!query) {
        return reply("What would you like me to look up for you?");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

    try {
        const response = await http.get("https://haji-mix-api.gleeze.com/api/xdash", {
            params: { ask: query, stream: false }
        });

        const data = response.data.answer;

        if (!data || !data.llm_response) {
            return reply("I couldn't find any specific information on that. Maybe try rephrasing?");
        }

        const cleanResponse = data.llm_response
            .replace(/【citation:\d+】/g, "")
            .replace(/```mermaid[\s\S]*?```/g, "")
            .replace(/---\n\n### Timeline \(Mermaid\)/g, "")
            .replace(/\n---\n\n\*\*Assumptions\*\*[\s\S]*?$/g, "")
            .trim();

        await api.sendMessage(`🔎 **Searching...**\n\n${cleanResponse}`, senderID);

        if (data.results && data.results.length > 0) {
            const sources = data.results.slice(0, 6).map(item => ({
                title: item.name.length > 80 ? item.name.substring(0, 77) + "..." : item.name,
                subtitle: item.snippet.length > 80 ? item.snippet.substring(0, 77) + "..." : item.snippet,
                image_url: "https://files.catbox.moe/5688j6.png",
                buttons: [{ type: "web_url", url: item.url, title: "Read Source" }]
            }));
            
            await api.sendCarousel(sources, senderID);
        }

    } catch (error) {
        reply("I'm having a little trouble connecting to my search tools right now. Can you try again in a moment?");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
