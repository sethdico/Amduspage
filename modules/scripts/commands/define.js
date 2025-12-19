const axios = require("axios");

module.exports.config = {
    name: "define",
    author: "Sethdico",
    version: "3.5",
    category: "Utility",
    description: "Professional dictionary",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args }) {
    const input = args.join(" ").trim();
    if (!input) return api.sendMessage("📖 Usage: define <word>", event.sender.id);

    // Regex to handle quotes like Fbot
    let word;
    const quotedMatch = input.match(/"([^"]+)"|'([^']+)'/);
    word = quotedMatch ? (quotedMatch[1] || quotedMatch[2]) : input.split(" ")[0];
    word = word.toLowerCase().trim();

    api.sendTypingIndicator(true, event.sender.id);

    try {
        const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
        const response = await axios.get(apiUrl);
        const data = response.data[0];

        let msg = `📖 **Definition of "${word}"**\n━━━━━━━━━━━━━━━━`;

        if (data.phonetic) msg += `\n🗣️ **Pronunciation:** ${data.phonetic}`;
        if (data.origin) msg += `\n🏛️ **Etymology:** ${data.origin}`;
        msg += `\n`;

        let definitionCount = 0;
        const maxDefinitions = 3;

        for (const meaning of data.meanings) {
            const partOfSpeech = meaning.partOfSpeech || "unknown";
            for (const def of meaning.definitions) {
                if (definitionCount >= maxDefinitions) break;
                definitionCount++;
                msg += `\n🔸 **${partOfSpeech}**\n📝 ${def.definition}`;
                if (def.example) msg += `\n💡 *Ex:* "${def.example}"`;
            }
            if (definitionCount >= maxDefinitions) break;
        }

        await api.sendMessage(msg, event.sender.id);

        // Audio Handling
        const audioPhonetic = data.phonetics.find(p => p.audio && p.audio.includes('http'));
        if (audioPhonetic && audioPhonetic.audio) {
            // Pagebot can send audio URL directly
            api.sendAttachment("audio", audioPhonetic.audio, event.sender.id);
        }

    } catch (error) {
        api.sendMessage(`❌ Word not found: "${word}"`, event.sender.id);
    } finally {
        api.sendTypingIndicator(false, event.sender.id);
    }
};
