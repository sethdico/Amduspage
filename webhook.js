const fs = require("fs");
const path = require("path");
const messagesCache = {};

module.exports = (req, res) => {
    if (req.method !== "POST") return res.sendStatus(405);

    const data = req.body;
    if (!data?.object || data.object !== "page") return res.sendStatus(400);

    const entries = data.entry || [];
    for (const entry of entries) {
        const messaging = entry.messaging || [];
        for (const event of messaging) {
            if (event.message) {
                const senderId = event.sender.id;
                const mid = event.message.mid;

                if (mid) {
                    // Initialize cache object if not exists
                    if (!messagesCache[mid]) messagesCache[mid] = {};

                    // Only store what's present
                    if (typeof event.message.text !== 'undefined') {
                        messagesCache[mid].text = event.message.text;
                    }

                    if (event.message.attachments && event.message.attachments.length > 0) {
                        messagesCache[mid].attachments = event.message.attachments;
                    }

                    // Save to data.json as fallback for replies
                    const dataPath = path.join(__dirname, "..", "data.json");
                    let existingData = {};
                    if (fs.existsSync(dataPath)) {
                        try {
                            existingData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
                        } catch (e) {
                            console.error("Failed to read data.json:", e);
                        }
                    }
                    existingData[mid] = messagesCache[mid];
                    fs.writeFileSync(dataPath, JSON.stringify(existingData, null, 2));
                }
            }
        }
    }

    res.sendStatus(200);
};
