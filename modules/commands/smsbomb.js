const { http } = require("../utils");

module.exports.config = {
    name: "smsbomb",
    author: "sethdico",
    version: "1.0",
    category: "Utility",
    description: "Send SMS spam to a number. The owner and developer of this bot shall not be held responsible for any misuse, harm, or legal consequences resulting from the use of this command. Use at your own risk and for testing purposes only.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 30,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const phone = args[0];
    let amount = parseInt(args[1]) || 5;
    const senderID = event.sender.id;

    if (!phone) {
        return reply("Usage: smsbomb [number] [amount]\n\nExample: smsbomb 922924522 20\n\nDisclaimer: By using this command, you acknowledge that you are solely responsible for your actions.");
    }

    // safety cap just incase
    if (amount > 50) {
        amount = 50;
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

    try {
        const response = await http.get("https://haji-mix-api.gleeze.com/api/smsbomber", {
            params: { 
                phone: phone, 
                amount: amount 
            }
        });

        if (response.data.success) {
            reply(`[Disclaimer: Educational Use Only]\n\nProcessing ${amount} SMS messages for ${phone}. Please note that delivery depends on network services.`);
        } else {
            reply("The SMS service is currently unavailable. Please try again later.");
        }

    } catch (error) {
        reply("An error occurred while attempting to initiate the request.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
