const axios = require("axios");

module.exports.config = {
    name: "sim",
    author: "Sethdico",
    version: "2.2",
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

    if (input === "guide") {
         return reply("usage:\nsim teach ask | answer\n\nex:\nsim teach hi | hello");
    }

    if (!input) {
        const msg = "talk to me or teach me.";
        const buttons = [
            { type: "postback", title: "how to teach", payload: "sim guide" }
        ];
        return api.sendButton(msg, buttons, senderID);
    }

    if (args[0].toLowerCase() === "teach") {
        const content = args.slice(1).join(" ");
        const parts = content.split("|");

        if (parts.length < 2) {
            return reply("wrong format. check sim guide.");
        }

        const ask = parts[0].trim();
        const ans = parts[1].trim();

        try {
            await axios.get("https://simsimi.ooguy.com/teach", {
                params: { ask, ans, apikey: apiKey }
            });
            return reply(`learned. ask "${ask}" and i'll say "${ans}".`);
        } catch (e) {
            return reply("cant learn that rn.");
        }
    }

    try {
        const res = await axios.get("https://simsimi.ooguy.com/sim", {
            params: { query: input, apikey: apiKey }
        });
        
        const responseText = res.data.respond || "idk what to say.";
        
        const buttons = [
            { type: "postback", title: "teach me", payload: "sim guide" }
        ];
        
        api.sendButton(responseText, buttons, senderID);

    } catch (e) {
        reply("simsimi is sleeping.");
    }
};
