const { http } = require("../utils");

module.exports.config = {
    name: "gpt4o",
    author: "sethdico",
    version: "1.1",
    category: "AI",
    description: "Interact with GPT-4o AI with conversation history, image generation, recognition, and browsing.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const query = args.join(" ");
    const senderID = event.sender.id;

    const attachments = [
        ...(event.message?.attachments || []),
        ...(event.message?.reply_to?.attachments || [])
    ].filter(a => a.type === "image");

    const imageUrl = attachments.length > 0 ? attachments[0].payload.url : "";

    if (!query && !imageUrl) {
        return reply("What's on your mind? You can also send or reply to an image.");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

    try {
        const response = await http.get("https://haji-mix-api.gleeze.com/api/gpt4o", {
            params: {
                ask: query || "Describe this image",
                uid: senderID,
                roleplay: "You are a helpful and accurate AI assistant. Chatgpt4o by seth asher.",
                img_url: imageUrl
            }
        });

        const answer = response.data.answer;

        if (!answer) {
            return reply("I couldn't get a response. Maybe try rephrasing your question?");
        }

        const formattedAnswer = answer
            .replace(/\[(.*?)\]\((https?:\/\/.*?)\)/g, (match, text, url) => `${text}: ${url}`)
            .trim();

        await api.sendMessage(`🌌 **GPT-4o**\n────────────────\n${formattedAnswer}`, senderID);

    } catch (error) {
        reply("I'm having a bit of trouble connecting to my brain right now. Try again in a second?");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
