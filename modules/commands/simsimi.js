const axios = require("axios");

module.exports.config = {
    name: "sim",
    author: "sethdico",
    category: "Fun",
    description: "chat and teach simsimi",
    adminOnly: false,
    usePrefix: false,
    cooldown: 2,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const input = args.join(" ");
    const apiKey = process.env.SIMSIMI_API_KEY || "3c911401e5f5452fb6585f0ccb97cdb31b30ddec";
    const senderID = event.sender.id;

    if (args[0] === "teach") {
        const content = args.slice(1).join(" ");
        const [ask, ans] = content.split("|").map(s => s.trim());

        if (!ask || !ans) return reply("usage: sim teach <ask> | <answer>\nex: sim teach hi | hello");

        try {
            await axios.get("https://simsimi.ooguy.com/teach", { params: { ask, ans, apikey: apiKey } });
            return reply(`learned that. ask "${ask}" and i'll say "${ans}".`);
        } catch (e) {
            return reply("cant learn that rn.");
        }
    }

    if (!input) return reply("talk to me or type 'sim teach <ask> | <answer>' to train me.");

    try {
        const res = await axios.get("https://simsimi.ooguy.com/sim", { params: { query: input, apikey: apiKey } });
        reply(res.data.respond || "idk what to say.");
    } catch (e) {
        reply("simsimi is sleeping.");
    }
};
