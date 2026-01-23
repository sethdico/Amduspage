const axios = require("axios");

module.exports.config = {
    name: "lyrics",
    author: "Sethdico",
    version: "1.0",
    category: "Media",
    description: "search song lyrics",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, reply }) {
    const query = args.join(" ");
    if (!query) return reply("what song?");

    try {
        const res = await axios.get("https://api-library-kohi.onrender.com/api/lyrics", {
            params: { query: query }
        });

        const { title, artist, lyrics } = res.data.data;
        if (!lyrics) return reply("lyrics not found.");

        reply(`${title}\n${artist}\n\n${lyrics}`);
    } catch (e) {
        reply("lyrics api is down.");
    }
};
