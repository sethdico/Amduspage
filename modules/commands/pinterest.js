const { http } = require("../utils");

module.exports.config = {
    name: "pinterest",
    aliases: ["pin"],
    author: "sethdico",
    version: "1.1",
    category: "Media",
    adminOnly: false,
    usePrefix: false,
    cooldown: 10,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const senderID = event.sender.id;

    if (!args.length) {
        return reply("📌 pinterest search\n━━━━━━━━━━━━━━━━\nhow to use:\n  pin <search>\n  pin <search> <count>\n\nexamples:\n  pin cat memes\n  pin cars 5\n\nmax is 10 images at a time.");
    }

    let count = 5;
    let query = args.join(" ");

    if (!isNaN(args[args.length - 1])) {
        const num = parseInt(args[args.length - 1]);
        if (num > 0) {
            count = Math.min(num, 10);
            query = args.slice(0, -1).join(" ");
        }
    }

    if (!query) return reply("what do you want to search?");

    reply(`grabbing ${count} "${query}" pics from pinterest...`);

    try {
        const res = await http.get("https://api-library-kohi.onrender.com/api/pinterest", {
            params: { query: query, count: count }
        });

        const images = res.data.data;

        if (!images || !images.length) {
            return reply("couldn't find anything for that.");
        }

        for (let i = 0; i < Math.min(images.length, count); i++) {
            await api.sendAttachment("image", images[i], senderID);
            
            if (i < count - 1) {
                await new Promise(r => setTimeout(r, 2000));
            }
        }

    } catch (e) {
        reply("pinterest api is acting up right now.");
    }
};
