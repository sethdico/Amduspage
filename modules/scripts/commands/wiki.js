const { http, parseAI } = require("../../utils");

module.exports.config = {
    name: "wiki",
    author: "Sethdico",
    version: "6.0",
    category: "Utility",
    description: "Wikipedia search, random articles, and history.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const query = args.join(" ").trim();
    const id = event.sender.id;

    // Flow: If no query is provided, show the discovery menu
    if (!query) {
        const msg = "📚 **WIKI SEARCH**\n━━━━━━━━━━━━━━━━\nType a topic to search or choose a mode:";
        const buttons = [
            { type: "postback", title: "📅 On This Day", payload: "wiki today" },
            { type: "postback", title: "🎲 Random Article", payload: "wiki random" }
        ];
        return api.sendButton(msg, buttons, id);
    }

    // Handle "Today" flow (History)
    if (query.toLowerCase() === "today") {
        const mm = String(new Date().getMonth() + 1).padStart(2, '0');
        const dd = String(date = new Date().getDate()).padStart(2, '0');
        try {
            const res = await http.get(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/${mm}/${dd}`);
            const events = res.data.selected;
            const e = events[Math.floor(Math.random() * events.length)];
            const msg = `📅 **HISTORY: ${mm}/${dd}**\n━━━━━━━━━━━━━━━━\nIn **${e.year}**: ${e.text}`;
            return api.sendButton(msg, [{ type: "postback", title: "🎲 Another Event", payload: "wiki today" }], id);
        } catch (err) { return reply("❌ History unavailable."); }
    }

    // Handle "Random" flow
    if (query.toLowerCase() === "random") {
        try {
            const res = await http.get(`https://en.wikipedia.org/api/rest_v1/page/random/summary`);
            const data = res.data;
            const buttons = [
                { type: "web_url", url: data.content_urls.desktop.page, title: "📖 Read More" },
                { type: "postback", title: "🔄 Another Random", payload: "wiki random" }
            ];
            if (data.originalimage?.source) await api.sendAttachment("image", data.originalimage.source, id);
            return api.sendButton(`🎲 **RANDOM: ${data.title}**\n\n${data.extract}`, buttons, id);
        } catch (err) { return reply("❌ Random failed."); }
    }

    // Handle Standard Search
    try {
        const res = await http.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
        const data = res.data;

        if (data.type === "disambiguation") {
            return reply(`⚠️ "${data.title}" is too broad. Try being more specific.`);
        }

        const buttons = [
            { type: "web_url", url: data.content_urls.desktop.page, title: "📖 Read Article" },
            { type: "postback", title: "🎲 Random", payload: "wiki random" }
        ];

        // Send image if article has one
        if (data.originalimage?.source) {
            await api.sendAttachment("image", data.originalimage.source, id);
        }

        const msg = `📚 **${data.title.toUpperCase()}**\n━━━━━━━━━━━━━━━━\n${data.extract}`;
        return api.sendButton(msg, buttons, id);

    } catch (error) {
        reply(`❌ No results found for "${query}".`);
    }
};
