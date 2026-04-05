const { http } = require("../utils");

module.exports.config = {
    name: "dalle",
    author: "sethdico",
    category: "Media",
    description: "create AI images using DALL-E from text prompts",
    adminOnly: false,
    usePrefix: false,
    cooldown: 10,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const prompt = args.join(" ");
    const uid = event.sender.id;

    if (!prompt) {
        return reply(`𝗗𝗔𝗟𝗟𝗘 𝗚𝗘𝗡𝗘𝗥𝗔𝗧𝗢𝗥

usage:
dalle <prompt>

example:
dalle cyberpunk cat`);
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, uid);

    try {
        reply("generating... this might take a sec");

        const res = await http.get("https://api-library-kohi.onrender.com/api/opendalle", {
            params: { prompt: prompt }
        });

        const image = res.data.data || res.data.url || res.data;

        if (image) {
            await api.sendAttachment("image", image, uid);
        } else {
            reply("failed to generate. try a different prompt");
        }

    } catch (e) {
        reply("api is sleeping or having issues");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
    }
};
