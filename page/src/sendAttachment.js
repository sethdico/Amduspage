const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = async function (type, source, threadID, messageID = null) {
    const accessToken = global.accessToken;
    const apiVersion = "v21.0";
    const url = `https://graph.facebook.com/${apiVersion}/me/messages?access_token=${accessToken}`;

    try {
        let attachmentPayload;

        if (typeof source === "string" && source.startsWith("http")) {
            // Send URL directly (only allowed for image/audio/video)
            if (["image", "audio", "video"].includes(type)) {
                attachmentPayload = {
                    type: type,
                    payload: { url: source, is_reusable: true }
                };
            } else {
                throw new Error("URL attachments only supported for image/audio/video types");
            }
        } else {
            // Upload local file
            const fileStats = fs.statSync(source);
            if (!fileStats.isFile()) throw new Error("Attachment source is not a valid file");

            const form = new FormData();
            form.append("recipient", JSON.stringify({ id: threadID }));
            form.append("message", JSON.stringify({
                attachment: {
                    type: type,
                    payload: {}
                }
            }));
            form.append("filedata", fs.createReadStream(source), {
                filename: path.basename(source),
                contentType: "application/octet-stream"
            });

            const response = await axios.post(url, form, {
                headers: form.getHeaders(),
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            });
            return response.data;
        }

        // Send message with URL payload
        const response = await axios.post(url, {
            recipient: { id: threadID },
            message: {
                attachment: attachmentPayload
            }
        }, {
            headers: { "Content-Type": "application/json" }
        });

        return response.data;

    } catch (error) {
        console.error("Error in sendAttachment:", error.message || error);
        throw error;
    }
};
