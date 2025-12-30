const { http } = require("../../utils");

module.exports.config = {
    name: "dict", author: "Sethdico", version: "11.0", category: "Utility", description: "Dictionary with flow.", adminOnly: false, usePrefix: false, cooldown: 3,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const isSlang = args[0]?.toLowerCase() === "slang";
    const query = isSlang ? args.slice(1).join(" ") : args.join(" ");

    if (!query) return reply("📖 Usage: dict <word>");

    if (isSlang) {
        try {
            const res = await http.get(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(query)}`);
            const entry = res.data.list[0];
            if (!entry) return reply(`❌ No slang found for "${query}".`);
            return api.sendButton(`🛹 **URBAN: ${query.toUpperCase()}**\n\n${entry.definition.replace(/[\[\]]/g, "")}`, [{ title: "Formal Dict", payload: `dict ${query}` }], event.sender.id);
        } catch (e) { return reply("❌ Urban Dictionary offline."); }
    }

    try {
        const res = await http.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(query)}`);
        const def = res.data[0].meanings[0].definitions[0].definition;
        return api.sendButton(`📖 **${query.toUpperCase()}**\n\n${def}`, [{ title: "Urban Slang", payload: `dict slang ${query}` }], event.sender.id);
    } catch (e) {
        reply(`❌ No definition for "${query}".`);
    }
};
