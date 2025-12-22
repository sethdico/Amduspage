const axios = require("axios");

module.exports.config = {
    name: "dict",
    author: "Sethdico",
    version: "7.0-Fixed",
    category: "Utility",
    description: "Merriam-Webster + Urban Dictionary (Slang) Integration with Real Randomization.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api }) {
    let input = args.join(" ").trim();
    let forceSlang = false;

    if (args[0]?.toLowerCase() === "slang" || args[0]?.toLowerCase() === "urban") {
        forceSlang = true;
        input = args.slice(1).join(" ").trim();
    }

    // ✅ Fixed: Handle random with proper fallback
    if (input.toLowerCase() === "random") {
        try {
            if (forceSlang) {
                const rndRes = await axios.get("https://api.urbandictionary.com/v0/random", { timeout: 5000 });
                if (rndRes.data.list && rndRes.data.list.length > 0) {
                    input = rndRes.data.list[0].word;
                }
            } else {
                const rndRes = await axios.get("https://random-word-api.herokuapp.com/word?number=1", { timeout: 5000 });
                if (rndRes.data && rndRes.data.length > 0) {
                    input = rndRes.data[0];
                }
            }
        } catch (e) {
            console.error("Random word API failed:", e.message);
        }
        
        // ✅ Fallback if API returned empty or failed
        if (!input || input === "random") {
            const backupWords = ["serendipity", "petrichor", "sonder", "defenestration", "limerence"];
            input = backupWords[Math.floor(Math.random() * backupWords.length)];
        }
    }

    if (!input) {
        return api.sendMessage(
            "📖 **Usage:**\n• dict <word> (Standard)\n• dict slang <word> (Street)\n• dict random (Surprise me)\n• dict slang random (Random Slang)",
            event.sender.id
        );
    }

    api.sendTypingIndicator(true, event.sender.id);

    if (forceSlang) {
        return searchUrbanDictionary(input, event, api);
    }

    try {
        const word = input.replace(/[^a-zA-Z\s-]/g, "").toLowerCase();
        const apiKey = process.env.DICT_API_KEY || "0a415fd9-1ec3-4145-9f53-d534da653b1f";
        const url = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word)}?key=${apiKey}`;
        
        const response = await axios.get(url);
        const data = response.data;

        if (!data || data.length === 0 || typeof data[0] === "string") {
            return searchUrbanDictionary(input, event, api, true);
        }

        const entry = data[0];
        const headword = entry.hwi?.hw?.replace(/\*/g, "•") || word;
        const pronunciation = entry.hwi?.prs?.[0]?.mw || "---";
        const type = entry.fl || "unknown";

        let defText = "";
        if (entry.shortdef && entry.shortdef.length > 0) {
            entry.shortdef.slice(0, 3).forEach((def, i) => defText += `${i + 1}. ${def}\n`);
        } else {
            defText = "No short definition available.";
        }

        let etymology = entry.et?.[0]?.[1]?.replace(/{[^{}]+}/g, "") || "Origin details unavailable.";
        let timeTravel = entry.date?.replace(/{[^{}]+}/g, "") || "Date unknown";

        let synonyms = "None found";
        let antonyms = "None found";

        if (entry.meta) {
            if (entry.meta.syns && entry.meta.syns.length > 0) {
                synonyms = entry.meta.syns.flat().slice(0, 8).join(", ");
            }
            if (entry.meta.ants && entry.meta.ants.length > 0) {
                antonyms = entry.meta.ants.flat().slice(0, 8).join(", ");
            }
        }

        const msg = `📖 **${headword.toUpperCase()}**
───────────────
🗣️ **Pronunciation:** /${pronunciation}/
🏷️ **Type:** ${type}

📝 **Definitions:**
${defText}
───────────────
📜 **Etymology:** ${etymology}
⏳ **Time Travel:** ${timeTravel}

🔄 **Synonyms:** ${synonyms}
↔️ **Antonyms:** ${antonyms}
───────────────`;

        await api.sendMessage(msg, event.sender.id);

        if (entry.hwi?.prs?.[0]?.sound?.audio) {
            const audioName = entry.hwi.prs[0].sound.audio;
            let subdir = "";
            
            if (audioName.startsWith("bix")) subdir = "bix";
            else if (audioName.startsWith("gg")) subdir = "gg";
            else if (!isNaN(audioName.charAt(0)) || audioName.startsWith("_")) subdir = "number";
            else subdir = audioName.charAt(0);

            const audioUrl = `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdir}/${audioName}.mp3`;
            await api.sendAttachment("audio", audioUrl, event.sender.id);
        }

    } catch (error) {
        searchUrbanDictionary(input, event, api, true);
    } finally {
        api.sendTypingIndicator(false, event.sender.id);
    }
};

async function searchUrbanDictionary(query, event, api, isFallback = false) {
    try {
        const res = await axios.get(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(query)}`);
        const list = res.data.list;

        if (!list || list.length === 0) {
            return api.sendMessage(`❌ Word not found in Standard or Slang dictionaries: "${query}"`, event.sender.id);
        }

        const entry = list[0];
        
        const cleanDefinition = entry.definition.replace(/\[|\]/g, "");
        const cleanExample = entry.example.replace(/\[|\]/g, "");
        const date = new Date(entry.written_on).toLocaleDateString();

        const title = isFallback ? `📖 **${entry.word.toUpperCase()}** (Slang/Urban)` : `🛹 **${entry.word.toUpperCase()}** (Slang)`;
        const note = isFallback ? "\n*(Standard dictionary didn't have this, so I checked Urban Dictionary)*" : "";

        const msg = `${title}
───────────────
📝 **Definition:**
${cleanDefinition}

💡 **Example:**
"${cleanExample}"
───────────────
👍 **Likes:** ${entry.thumbs_up} | 👎 **Dislikes:** ${entry.thumbs_down}
📅 **Added:** ${date}
✍️ **Author:** ${entry.author}${note}`;

        await api.sendMessage(msg, event.sender.id);

    } catch (e) {
        api.sendMessage("❌ Error connecting to Dictionary databases.", event.sender.id);
    }
}
