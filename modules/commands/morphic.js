const axios = require("axios");

module.exports.config = {
    name: "morphic",
    author: "sethdico",
    version: "2.6",
    category: "AI",
    description: "Morphic AI(webscrape).",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const query = args.join(" ");
    const uid = event.sender.id;

    if (!query) return reply("Please provide a question.");

    const chatId = Math.random().toString(36).substring(2, 15);
    const cookie = process.env.MORPHIC_COOKIE;

    if (!cookie) return reply("System Error: MORPHIC_COOKIE is missing.");

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, uid);

    try {
        const response = await axios({
            method: 'post',
            url: 'https://chat.morphic.sh/api/chat',
            responseType: 'stream',
            data: {
                trigger: "submit-message",
                chatId: chatId,
                isNewChat: true,
                message: {
                    role: "user",
                    parts: [{ type: "text", text: query }]
                },
                messages: [{ role: "user", parts: [{ type: "text", text: query }] }]
            },
            headers: {
                "authority": "chat.morphic.sh",
                "accept": "application/json",
                "content-type": "application/json",
                "origin": "https://chat.morphic.sh",
                "referer": "https://chat.morphic.sh/",
                "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
                "cookie": cookie
            }
        });

        let fullText = "";
        let buffer = "";

        response.data.on('data', (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.substring(6).trim();
                    if (!jsonStr || jsonStr === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(jsonStr);
                        if (parsed.type === 'text-delta' && parsed.delta) {
                            fullText += parsed.delta;
                        }
                    } catch (e) {}
                }
            }
        });

        response.data.on('end', () => {
            if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
            
            if (!fullText) return reply("Morphic returned an empty response.");

            const cleanResponse = fullText.replace(/\[\d+\]\(#.*?\)/g, '');
            reply(`ðŸŒ **MORPHIC SEARCH**\nâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€\n${cleanResponse.trim()}`);
        });

        response.data.on('error', (err) => { throw err; });

    } catch (error) {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
        reply("Request failed. Check logs for details.");
    }
};
