const axios = require("axios");

module.exports.config = {
    name: "google",
    author: "Sethdico",
    version: "2.1",
    category: "Utility",
    description: "search google with carousel results.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api }) {
    const query = args.join(" ");
    if (!query) return api.sendMessage("🔍 usage: google <topic>", event.sender.id);

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id).catch(()=>{});

    const API_KEY = process.env.GOOGLE_API_KEY; 
    const CX = process.env.GOOGLE_CX; 

    try {
        const targetUrl = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CX}&q=${encodeURIComponent(query)}`;
        const res = await axios.get(targetUrl);
        const items = res.data.items;

        if (!items || items.length === 0) {
            return api.sendMessage(`❌ no results for "${query}".`, event.sender.id);
        }

        const elements = items.slice(0, 5).map(item => {
            // ✅ FIXED: Truncate title/subtitle to 80 chars (FB Carousel Limit)
            const cleanTitle = item.title.length > 80 ? item.title.substring(0, 77) + "..." : item.title;
            const snippet = (item.snippet || "no description").replace(/\n/g, " ");
            const cleanSubtitle = snippet.length > 80 ? snippet.substring(0, 77) + "..." : snippet;
            const screenshotUrl = `https://image.thum.io/get/width/500/crop/400/noanimate/${item.link}`;

            return {
                title: cleanTitle,
                subtitle: cleanSubtitle,
                image_url: screenshotUrl,
                buttons: [{ type: "web_url", url: item.link, title: "🌍 visit site" }]
            };
        });

        await api.sendCarousel(elements, event.sender.id);
    } catch (e) {
        api.sendMessage("❌ google search failed.", event.sender.id);
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, event.sender.id).catch(()=>{});
    }
};
