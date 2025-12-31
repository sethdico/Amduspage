const { http } = require("../../utils");

module.exports.config = {
    name: "dict", 
    aliases: ["dictionary", "define"],
    author: "Sethdico", 
    version: "14.0-Fallback", 
    category: "Utility", 
    description: "Merriam-Webster(formal) > FreeDict > Urban(Slang).", 
    adminOnly: false, 
    usePrefix: false, 
    cooldown: 3,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const isSlang = args[0]?.toLowerCase() === "slang";
    const query = isSlang ? args.slice(1).join(" ") : args.join(" ");

    if (!query) return reply(`📖 Usage:\n• Formal: dict <word>\n• Slang: dict slang <word>`);

    // ==========================================
    // 1. URBAN DICTIONARY (SLANG)
    // ==========================================
    if (isSlang) {
        try {
            const res = await http.get(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(query)}`);
            const list = res.data.list;
            if (!list || list.length === 0) return reply(`❌ No slang definition found for "${query}".`);

            const entry = list[0];
            const definition = entry.definition.replace(/[\[\]]/g, "");
            const example = entry.example.replace(/[\[\]]/g, "");

            const msg = `🛹 **URBAN: ${query.toUpperCase()}**\n────────────────\n${definition}\n\n📝 **Ex:** ${example}`;
            const buttons = [{ type: "postback", title: "Formal Dict", payload: `dict ${query}` }];
            return api.sendButton(msg, buttons, event.sender.id);
        } catch (e) {
            return reply("❌ Urban Dictionary is currently offline.");
        }
    }

    // ==========================================
    // HELPER: FREE DICTIONARY (FALLBACK)
    // ==========================================
    const runFallback = async (suggestions = []) => {
        try {
            // console.log("Triggering Fallback...");
            const res = await http.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(query)}`);
            const data = res.data[0];

            const definition = data.meanings[0].definitions[0].definition;
            const phonetics = data.phonetics.find(p => p.text)?.text || "";
            const audioUrl = data.phonetics.find(p => p.audio)?.audio || "";

            let msg = `📖 **${data.word.toUpperCase()}**\n`;
            if (phonetics) msg += `/${phonetics}/\n`;
            msg += `────────────────\n• ${definition}\n\n(Source: FreeDict)`;

            const buttons = [{ type: "postback", title: "Urban Slang", payload: `dict slang ${query}` }];
            await api.sendButton(msg, buttons, event.sender.id);

            if (audioUrl) await api.sendAttachment("audio", audioUrl, event.sender.id);
            return; // Success

        } catch (e) {
            // BOTH APIs FAILED
            if (suggestions.length > 0) {
                return reply(`❌ Word not found. Did you mean: \n${suggestions.slice(0, 5).join(", ")}?`);
            }
            return reply(`❌ No definition found for "${query}".`);
        }
    };

    // ==========================================
    // 2. MERRIAM-WEBSTER (PRIMARY)
    // ==========================================
    const apiKey = process.env.DICT_API_KEY;
    
    // If no key, go straight to fallback
    if (!apiKey) return runFallback();

    try {
        const res = await http.get(`https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(query)}?key=${apiKey}`);
        const data = res.data;

        // Condition 1: Empty Result -> Try Fallback
        if (!data || data.length === 0) return runFallback();

        // Condition 2: Suggestions List (API returned array of strings) -> Try Fallback, pass suggestions
        if (typeof data[0] === 'string') return runFallback(data);

        // Success: Extract Data
        const entry = data[0];
        const definition = entry.shortdef ? entry.shortdef.join("\n• ") : "No definition available.";
        const type = entry.fl || "unknown"; 
        const pronunciation = entry.hwi?.prs?.[0]?.mw || ""; 

        let msg = `📖 **${entry.hwi?.hw?.replace(/\*/g, "") || query.toUpperCase()}** (${type})\n`;
        if (pronunciation) msg += `/${pronunciation}/\n`;
        msg += `────────────────\n• ${definition}\n\n(Source: Merriam-Webster)`;

        const buttons = [{ type: "postback", title: "Urban Slang", payload: `dict slang ${query}` }];
        await api.sendButton(msg, buttons, event.sender.id);

        // Audio Logic
        if (entry.hwi?.prs?.[0]?.sound?.audio) {
            const audioName = entry.hwi.prs[0].sound.audio;
            let subdir = audioName[0];
            if (!isNaN(subdir) || !/^[a-zA-Z]/.test(subdir)) subdir = "number";
            else if (audioName.startsWith("bix")) subdir = "bix";
            else if (audioName.startsWith("gg")) subdir = "gg";

            const audioUrl = `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdir}/${audioName}.mp3`;
            await api.sendAttachment("audio", audioUrl, event.sender.id);
        }

    } catch (e) {
        console.error("MW Error, trying fallback:", e.message);
        return runFallback();
    }
};
