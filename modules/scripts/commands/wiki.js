const axios = require("axios");

// Your Wikimedia API Token
const WIKI_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiJkOGY5M2FhZjZkYmRiNjBhODE4OTBmMzJhM2UyNTNmOSIsImp0aSI6ImZjZTRiZWI4OTk1ZTFjNTc1ZTVmNTQyMDc5YmE4ZTBmM2Q0OWYyMGU0M2EwNzFjZjhkNTQ5YzJhMDIyNTc4ZWM2NmNjMjFhNzJkNzY1ZDZmIiwiaWF0IjoxNzY2MzMyNDQ0LjQ1NjI1OCwibmJmIjoxNzY2MzMyNDQ0LjQ1NjI2LCJleHAiOjMzMzIzMjQxMjQ0LjQ1NDI1LCJzdWIiOiI4MTMyOTU5MyIsImlzcyI6Imh0dHBzOi8vbWV0YS53aWtpbWVkaWEub3JnIiwicmF0ZWxpbWl0Ijp7InJlcXVlc3RzX3Blcl91bml0Ijo1MDAwLCJ1bml0IjoiSE9VUiJ9LCJzY29wZXMiOlsiYmFzaWMiXX0.WCtJZjuU9uannqn8T-z5xXNpm8s89OCJXoX5aRjf4eJf40zFXUzznHYB1jVOZNe0BD0NvZwxYZ354I1E7Ph8KrPtT7FJcTDjlP1dGP_UVI8mb_IK3pv4pOd8rjTOoJMpsdPg_6zINAVshsX0KuSMwABRb6fUWkapAgfiidHK1tZktYanSIKVKJPcmFoDwo4NC3MI_Fed41A35WoFnEuKHTKYzjMlTKPn5aepoHgYqR-r0UCe4Dnu6Mqd-Z4yZstS-CbQxiGfGayzBFIIRgqHNa47x4AGj2e3Wp6DKJ7Ym78d8pyBpMS-D9lKT0LtLxPaJ2kbQ0t1dn2jcAmwekSWasNR-_cU3Kk4nhCmxtQxBDgH-BzGzNGSAAkEB_7M3SfBQCj-dLeFlO6xi6PdapQH0F-a6AUm8PM_3xLm-XdFqEcsgwKz6kakEvaE6_7w4nqkK8c05MUJEOTSmD3QT0ejl8xCo1U8HtHkALwZxf5r6OBmhkaUuv7eUOHBVdCMolZi9SQhXUoD_8PUPVPJO1CqzxmKTQWB_GFrEyKHp0P5Wl_WIAB7dU999DK1ic_mRz9nM_tcuFY53vAyryTq6vIPVgpK027Mzb7Lk2hABQnPO0YXcxO177bV4CfurP6Ut6fJXjx4zk5dyzFPytrqNApFbK08GFPeyqyGYycjz_qVcBY";

const HEADERS = {
    'Authorization': `Bearer ${WIKI_TOKEN}`,
    'User-Agent': 'Amdusbot/5.0 (https://github.com/sethdico/my-pagebot)'
};

module.exports.config = {
    name: "wiki",
    author: "Sethdico",
    version: "5.0",
    category: "Utility",
    description: "Wikipedia search with API Token.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api }) {
    const senderID = event.sender.id;
    const query = args.join(" ").trim();
    if (!query) return api.sendMessage("🔍 Usage: wiki <topic>", senderID);

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID).catch(() => {});

    try {
        // 1. Search for titles using the token
        const search = await axios.get(`https://en.wikipedia.org/w/api.php`, {
            params: { action: "opensearch", search: query, limit: 5, format: "json" },
            headers: HEADERS
        });

        if (!search.data[1]?.length) return api.sendMessage(`❌ No results found for "${query}".`, senderID);

        const titles = search.data[1];
        const elements = [];

        // 2. Fetch summaries for the titles
        const requests = titles.map(title => 
            axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, { headers: HEADERS }).catch(() => null)
        );
        
        const summaries = await Promise.all(requests);

        summaries.forEach(res => {
            if (!res || !res.data) return;
            const data = res.data;
            elements.push({
                title: data.title,
                subtitle: data.extract ? data.extract.substring(0, 80) + "..." : "Tap to read more.",
                image_url: data.thumbnail?.source || data.originalimage?.source || "https://upload.wikimedia.org/wikipedia/commons/6/63/Wikipedia-logo-en-big.png",
                buttons: [{ type: "web_url", url: data.content_urls.desktop.page, title: "📖 Read More" }]
            });
        });

        if (api.sendCarousel && elements.length > 0) {
            await api.sendCarousel(elements, senderID);
        } else {
            api.sendMessage(`📚 **${elements[0].title}**\n\n${elements[0].subtitle}`, senderID);
        }
    } catch (e) {
        console.error("Wiki Error:", e.message);
        api.sendMessage("❌ Wiki lookup failed. Please check API Token.", senderID);
    }
};
