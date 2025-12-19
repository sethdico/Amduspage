const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

module.exports = function (event) {
  return async function sendAttachment(type, source, senderID) {
    const recipientID = senderID || event.sender.id;
    const accessToken = global.PAGE_ACCESS_TOKEN; // Fixed Variable Name

    // 1. Check if it's a URL or a Local File
    const isUrl = typeof source === 'string' && (source.startsWith('http://') || source.startsWith('https://'));

    // 2. Map types to Facebook standards
    // Facebook accepts: image, audio, video, file
    const mediaType = ['image', 'audio', 'video'].includes(type) ? type : 'file';

    try {
      if (isUrl) {
        // --- SEND VIA URL ---
        await axios.post(
          `https://graph.facebook.com/v21.0/me/messages?access_token=${accessToken}`,
          {
            recipient: { id: recipientID },
            message: {
              attachment: {
                type: mediaType,
                payload: { url: source, is_reusable: true }
              }
            }
          }
        );
      } else {
        // --- UPLOAD LOCAL FILE ---
        if (!fs.existsSync(source)) {
            console.error("File does not exist:", source);
            return;
        }

        const form = new FormData();
        form.append("message", JSON.stringify({
          attachment: {
            type: mediaType, 
            payload: { is_reusable: true }
          }
        }));

        form.append("filedata", fs.createReadStream(source));

        // Upload to Facebook
        const uploadRes = await axios.post(
          `https://graph.facebook.com/v21.0/me/message_attachments?access_token=${accessToken}`,
          form,
          { headers: form.getHeaders() }
        );

        const attachmentId = uploadRes.data.attachment_id;

        // Send the message linking to that attachment
        await axios.post(
          `https://graph.facebook.com/v21.0/me/messages?access_token=${accessToken}`,
          {
            recipient: { id: recipientID },
            message: {
              attachment: {
                type: mediaType,
                payload: { attachment_id: attachmentId }
              }
            }
          }
        );
      }
    } catch (err) {
      console.error("SendAttachment Error:", err.response ? err.response.data : err.message);
    }
  };
};
