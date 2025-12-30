const { http } = require("../../utils");

module.exports.config = {
    name: "wiki",
    author: "Sethdico",
    version: "4.0",
    category: "Utility",
    description: "Wikipedia with PDF and discovery.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const query = args.join(" ").trim();
    const id = event.sender.id;

    if (!query) {
        return api.sendQuickReply("📚 **WIKI SEARCH**\n━━━━━━━━━━━━━━━━\nType a topic or tap a discovery mode below:", ["Random Article", "On This Day"], id);
    }

    if (query.toLowerCase() === "today") return handleOnThisDay(event, api);
    if (query.toLowerCase() === "random") return handleRandom(event, api);

    try {
        const res = await http.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
        const data = res.data;

        if (data.type === "disambiguation") return reply(`⚠️ "${data.title}" is too broad. Please be more specific.`);

        const buttons = [
            { type: "web_url", url: data.content_urls.desktop.page, title: "📖 Read More" },
            { type: "web_url", url: `https://en.wikipedia.org/api/rest_v1/page/pdf/${encodeURIComponent(query)}`, title: "📥 Get PDF" }
        ];

        const msg = `📚 **${data.title.toUpperCase()}**\n━━━━━━━━━━━━━━━━\n${data.extract}`;
        
        if (data.originalimage?.source) await api.sendAttachment("image", data.originalimage.source, id);
        
        await api.sendButton(msg, buttons, id);
        
        // Flow: Keep them browsing
        return api.sendQuickReply("💡 Explore more?", ["Random Article", "On This Day"], id);

    } catch (error) {
        reply(`❌ No results found for "${query}".`);
    }
};

async function handleOnThisDay(event, api) {
    const date = new Date();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    try {
        const res = await http.get(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/${mm}/${dd}`);
        const event = res.data.selected[Math.floor(Math.random() * res.data.selected.length)];
        const msg = `📅 **ON THIS DAY (${mm}/${dd})**\n━━━━━━━━━━━━━━━━\nIn **${event.year}**: ${event.text}`;
        return api.sendButton(msg, [{ type: "postback", title: "🎲 Another Event", payload: "wiki today" }], event.sender.id);
    } catch (e) { api.sendMessage("❌ History unavailable.", event.sender.id); }
}

async function handleRandom(event, api) {
    try {
        const res = await http.get(`https://en.wikipedia.org/api/rest_v1/page/random/summary`);
        const data = res.data;
        const msg = `🎲 **RANDOM: ${data.title}**\n\n${data.extract}`;
        return api.sendButton(msg, [{ type: "postback", title: "🔄 Another Random", payload: "wiki random" }], event.sender.id);
    } catch (e) { api.sendMessage("❌ Random failed.", event.sender.id); }
}
