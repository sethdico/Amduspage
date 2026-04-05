const { isPrivateHost } = require("../utils/helpers");

module.exports.config = {
    name: "screenshot",
    aliases: ["ss", "webshot"],
    author: "sethdico",
    version: "1.3",
    category: "Utility",
    description: "capture website screenshots",
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    let targetUrl = event.message?.reply_to?.text || args.join("");

    if (!targetUrl) {
        return reply(`𝗦𝗖𝗥𝗘𝗘𝗡𝗦𝗛𝗢𝗧

usage:
screenshot <link>
or reply to a link with 'ss'

example:
ss github.com`);
    }

    targetUrl = targetUrl.replace(/\s+/g, "").replace(/\[dot\]|\(dot\)/gi, ".");

    try {
        if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;
        
        const isUnsafe = await isPrivateHost(targetUrl);
        if (isUnsafe) {
            return reply("that link isn't allowed for security reasons");
        }

        const url = new URL(targetUrl);
        if (!['http:', 'https:'].includes(url.protocol)) {
            return reply("invalid protocol. use http or https");
        }
        targetUrl = url.href;

    } catch (e) {
        return reply("that doesn't look like a valid link");
    }

    reply("capturing...");
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id);
    
    try {
        const screenshotUrl = `https://image.thum.io/get/width/1200/crop/800/noanimate/${targetUrl}`;
        await api.sendAttachment("image", screenshotUrl, event.sender.id);
    } catch (e) {
        reply("failed to capture the site. maybe it's down or blocking bots");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, event.sender.id);
    }
};
