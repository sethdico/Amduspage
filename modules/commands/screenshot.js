const { isPrivateHost } = require("../utils/helpers");

module.exports.config = {
    name: "screenshot",
    aliases: ["ss", "webshot"],
    author: "Sethdico",
    version: "1.2",
    category: "Utility",
    description: "take a screenshot of any website",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api }) {
    let targetUrl = args.join("");
    if (!targetUrl) return api.sendMessage("usage: screenshot <url>", event.sender.id);

    try {
        if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;
        
        const isUnsafe = await isPrivateHost(targetUrl);
        if (isUnsafe) {
            return api.sendMessage("❌ that url is not allowed", event.sender.id);
        }

        const url = new URL(targetUrl);
        if (!['http:', 'https:'].includes(url.protocol)) {
            return api.sendMessage("❌ invalid protocol", event.sender.id);
        }
        targetUrl = url.href;

    } catch (e) {
        return api.sendMessage("❌ invalid url", event.sender.id);
    }

    api.sendMessage(`📸 capturing...`, event.sender.id);
    
    try {
        const screenshotUrl = `https://image.thum.io/get/width/1200/crop/800/noanimate/${targetUrl}`;
        await api.sendAttachment("image", screenshotUrl, event.sender.id);
    } catch (e) {
        api.sendMessage("❌ failed to capture.", event.sender.id);
    }
};
