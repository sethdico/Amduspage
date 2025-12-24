const axios = require("axios");

module.exports.config = {
    name: "google",
    aliases: ["search", "find", "g"],
    author: "Sethdico",
    version: "1.3-Fix",
    category: "Utility",
    description: "Search the web using Google.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api }) {
    const query = args.join(" ");
    if (!query) return api.sendMessage("🔍 Usage: google <topic>", event.sender.id);

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id).catch(()=>{});

    const API_KEY = "AIzaSyCPhWbGx54TYT1TdJzbddMfoepJkJmUXTo"; 
    const CX = "c12feb44f74064334"; 

    try {
        // We use the basic endpoint with minimal parameters to avoid conflicts
        const res = await axios.get("https://www.googleapis.com/customsearch/v1", {
            params: {
                key: API_KEY,
                cx: CX,
                q: query
            }
        });

        const items = res.data.items;
        if (!items || items.length === 0) {
            return api.sendMessage(`❌ No results found. (Check if your CSE allows 'Entire Web')`, event.sender.id);
        }

        let msg = `🔍 **Google: ${query}**\n━━━━━━━━━━━━━━━━\n`;
        const topItems = items.slice(0, 3);

        topItems.forEach((item, index) => {
            msg += `${index + 1}. **${item.title}**\n${item.snippet?.replace(/\n/g, " ")}\n🔗 ${item.link}\n\n`;
        });

        const buttons = [{
            type: "web_url",
            url: topItems[0].link,
            title: "🌍 Visit Result"
        }];

        await api.sendButton(msg, buttons, event.sender.id);

    } catch (e) {
        console.error("GOOGLE ERROR:", e.response?.data || e.message);
        const err = e.response?.data?.error;
        
        // Detailed Error Reporting for you
        if (err?.code === 400) return api.sendMessage(`❌ Config Error: ${err.message}\n(Check API Key restrictions or CSE settings)`, event.sender.id);
        if (err?.code === 403) return api.sendMessage("❌ Permission Error: API Key not enabled for Custom Search API.", event.sender.id);
        
        api.sendMessage("❌ Search failed.", event.sender.id);
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, event.sender.id).catch(()=>{});
    }
};
