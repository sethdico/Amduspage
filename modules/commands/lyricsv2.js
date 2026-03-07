const { http } = require("../utils");

module.exports.config = {
    name: "lyricsv2",
    author: "sethdico",
    version: "1.0",
    category: "Media",
    description: "Search song lyrics",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const songQuery = args.join(" ");
    const senderID = event.sender.id;

    if (!songQuery) return reply("What song are you looking for?");

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

    try {
        const response = await http.get("https://shin-apis.onrender.com/search/lyricsv2", {
            params: { title: songQuery }
        });

        const list = response.data.data;

        if (!list || list.length === 0) {
            return reply(`I couldn't find any lyrics for "${songQuery}".`);
        }

        const song = list[0];
        const title = song.trackName;
        const artist = song.artistName;
        const lyrics = song.plainLyrics;

        if (!lyrics) {
            return reply(`I found ${title} by ${artist}, but the lyrics aren't available.`);
        }

        const result = `🎵 ${title}\n🎤 ${artist}\n\n${lyrics}`;

        await api.sendMessage(result, senderID);

    } catch (error) {
        reply("I'm having trouble searching for lyrics right now.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
