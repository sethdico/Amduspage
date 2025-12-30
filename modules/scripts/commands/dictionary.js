const { http, parseAI } = require("../../utils");

module.exports.config = {
    name: "dict", author: "Sethdico", version: "9.0", category: "Utility", description: "Dictionary with Lite buttons.", adminOnly: false, usePrefix: false, cooldown: 3,
};

module.exports.run = async function ({ event, args, api, reply }) {
    let input = args.join(" ").trim();
    if (!input) return reply("📖 Usage: dict <word>");

    try {
        const res = await http.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(input)}`);
        const data = res.data[0];
        const def = data.meanings[0].definitions[0].definition;
        
        const msg = `📖 **${data.word.toUpperCase()}**\n${def}`;
        const buttons = [{ type: "postback", title: "🛹 Urban Slang", payload: `dict slang ${data.word}` }];

        return api.sendButton(msg, buttons, event.sender.id);
    } catch (e) {
        // Simple text fallback if API fails
        reply(`❌ No definition found for "${input}".`);
    }
};
