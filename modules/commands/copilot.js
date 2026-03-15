const { http } = require("../utils");

module.exports.config = {
    name: "copilot",
    author: "sethdico",
    category: "AI",
    description: "microsoft copilot with search & sources.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const uid = event.sender.id;
    let model = "default";
    let prompt = args.join(" ");

    if (args[0]?.startsWith("-")) {
        const flag = args[0].slice(1).toLowerCase();
        if (flag === "think") {
            model = "think-deeper";
            prompt = args.slice(1).join(" ");
        } else if (flag === "gpt5") {
            model = "gpt-5";
            prompt = args.slice(1).join(" ");
        }
    }

    if (!prompt) {
        return reply("🚀 **copilot**\n━━━━━━━━━━━━━━━━\nask me anything.\n\nflags:\n  -think (deep reasoning)\n  -gpt5 (new model)");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, uid);

    try {
        const res = await http.get("https://api-library-kohi.onrender.com/api/copilot", {
            params: { prompt, model, user: uid }
        });

        const result = res.data.data;
        if (!result || !result.text) return reply("i couldn't get an answer.");

        await api.sendMessage(`🚀 **copilot**\n\n${result.text}`.toLowerCase(), uid);

        if (result.citations?.length > 0) {
            const cards = result.citations.slice(0, 10).map(source => ({
                title: source.title.substring(0, 80),
                subtitle: source.url ? new URL(source.url).hostname : "visit source",
                image_url: source.icon || "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Microsoft_365_Copilot_Icon.svg/1024px-Microsoft_365_Copilot_Icon.svg.png",
                buttons: [{ type: "web_url", url: source.url, title: "read more" }]
            }));
            await api.sendCarousel(cards, uid);
        }
    } catch (e) {
        reply("copilot is having some issues right now.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
    }
};
