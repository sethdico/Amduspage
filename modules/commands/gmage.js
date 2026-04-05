const { http } = require("../utils");

module.exports.config = {
    name: "gmage",
    author: "sethdico",
    category: "Media",
    description: "search and display images from Google",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5
};

module.exports.run = async function ({ event, args, api, reply }) {
    const query = args.join(" ");
    const id = event.sender.id;

    if (!query) {
<<<<<<< HEAD
        return reply("search for images like this: gmage sunset beach");
=======
        return reply(`𝗚𝗢𝗢𝗚𝗟𝗘 𝗜𝗠𝗔𝗚𝗘𝗦

usage:
gmage <search term>

example:
gmage sunset beach`);
>>>>>>> 6590e5687fd16e076ec192408df9b73ccbc7977f
    }

    if (api.sendTypingIndicator) {
        api.sendTypingIndicator(true, id);
    }

    try {
        const res = await http.get("https://api-library-kohi.onrender.com/api/gmage", {
            params: { q: query }
        });

        const images = res.data.data;
        if (!images || !images.length) {
            return reply("no images found for that");
        }

        const cards = images.slice(0, 10).map(url => ({
            title: query.substring(0, 80),
            image_url: url,
            buttons: [{ type: "web_url", url: url, title: "view image" }]
        }));

        await api.sendCarousel(cards, id);
    } catch (e) {
        reply("google is not working right now");
    } finally {
        if (api.sendTypingIndicator) {
            api.sendTypingIndicator(false, id);
        }
    }
};
