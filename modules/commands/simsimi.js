const axios = require("axios");

module.exports.config = {
    name: "sim",
    author: "Sethdico",
    version: "2.0",
    category: "Fun",
    description: "Chat and Teach SimSimi",
    adminOnly: false,
    usePrefix: false,
    cooldown: 2,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const input = args.join(" ");
    const apiKey = "3c911401e5f5452fb6585f0ccb97cdb31b30ddec";
    const senderID = event.sender.id;

    if (input === "guide") {
         return reply("**How to Teach**\n\nType: sim teach <ask> | <answer>\n\nExample:\nsim teach hi | hello po master");
    }

    if (!input) {
        const msg = " **SimSimi Hub**\nTalk to me or teach me bad words (jk).";
        const buttons = [
            { type: "postback", title: "How to Teach?", payload: "sim guide" }
        ];
        return api.sendButton(msg, buttons, senderID);
    }

    if (args[0].toLowerCase() === "teach") {
        const content = args.slice(1).join(" ");
        const parts = content.split("|");

        if (parts.length < 2) {
            return reply(" **Format Error**\n\nUse: sim teach ask | answer");
        }

        const ask = parts[0].trim();
        const ans = parts[1].trim();

        try {
            await axios.get("https://simsimi.ooguy.com/teach", {
                params: { ask, ans, apikey: apiKey }
            });
            return reply(`**Learned!**\n\nIf you say: "${ask}"\nI'll say: "${ans}"`);
        } catch (e) {
            return reply(" I couldn't learn that phrase right now.");
        }
    }

    try {
        const res = await axios.get("https://simsimi.ooguy.com/sim", {
            params: { query: input, apikey: apiKey }
        });
        
        const responseText = res.data.respond || "I don't know what to say.";
        
        const buttons = [
            { type: "postback", title: "Teach Me", payload: "sim guide" }
        ];
        
        api.sendButton(` ${responseText}`, buttons, senderID);

    } catch (e) {
        reply(" SimSimi is sleeping.");
    }
};
