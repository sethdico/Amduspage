module.exports.config = {
    name: "screenshot",
    aliases: ["ss", "webshot"],
    author: "Sethdico",
    version: "1.0",
    category: "Utility",
    description: "Take a screenshot of any website.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api }) {
    // 1. Get the URL from user input
    let targetUrl = args.join("");
    
    if (!targetUrl) {
        return api.sendMessage("📸 Usage: screenshot <url>\nEx: screenshot google.com", event.sender.id);
    }

    // 2. Auto-fix URL (Add https:// if missing)
    if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = "https://" + targetUrl;
    }

    // 3. Visual Feedback
    api.sendMessage(`📸 Capturing: ${targetUrl}...`, event.sender.id);
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id).catch(()=>{});

    try {
        // 4. Generate Screenshot URL (1920x1080 resolution)
        const screenshotUrl = `https://image.thum.io/get/width/1920/crop/1080/noanimate/${targetUrl}`;

        // 5. Send Image
        await api.sendAttachment("image", screenshotUrl, event.sender.id);

    } catch (e) {
        console.error("Screenshot Error:", e.message);
        api.sendMessage("❌ Failed to load image. The website might be blocking bots.", event.sender.id);
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, event.sender.id).catch(()=>{});
    }
};
