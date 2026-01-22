const axios = require("axios");

module.exports.config = {
    name: "perplexity2",
    author: "Sethdico",
    version: "2.0",
    category: "AI",
    description: "Deep reasoning AI by Perplexity",
    adminOnly: false,
    usePrefix: false,
    cooldown: 8,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const prompt = args.join(" ");
    const uid = event.sender.id;

    if (!prompt) return reply("what should i think about?");

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, uid);

    try {
        const res = await axios.get("https://api-library-kohi.onrender.com/api/pollination-ai", {
            params: {
                prompt: prompt,
                model: "perplexity-reasoning",
                user: uid
            }
        });

        const answer = res.data.data;

        if (answer) {
            reply(answer);
        } else {
            reply("my brain is empty right now.");
        }

    } catch (e) {
        reply("perplexity is offline or busy.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
    }
};
