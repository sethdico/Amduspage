const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

module.exports = function (event) {
  return async function sendAttachment(type, source, senderID) {
    const recipientID = senderID || event.sender.id;
    
    // Facebook types: image, audio, video, file
    // If it's not image/audio/video, force it to be "file" (for PDFs, DOCX, etc)
    const validTypes = ['image', 'audio', 'video'];
    const mediaType = validTypes.includes(type) ? type : 'file';

    try {
      // 1. Prepare the upload form
      const form = new FormData();
      form.append("message", JSON.stringify({
        attachment: {
          type: mediaType, 
          payload: { is_reusable: true }
        }
      }));

      // 'source' is the path to the file in the cache folder
      form.append("filedata", fs.createReadStream(source));

      // 2. Upload to Facebook
      const uploadRes = await axios.post(
        `https://graph.facebook.com/v21.0/me/message_attachments?access_token=${global.PAGE_ACCESS_TOKEN}`,
        form,
        { headers: form.getHeaders() }
      );

      const attachmentId = uploadRes.data.attachment_id;

      // 3. Send the message linking to that attachment
      await axios.post(
        `https://graph.facebook.com/v21.0/me/messages?access_token=${global.PAGE_ACCESS_TOKEN}`,
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
      
      return true;
    } catch (err) {
      console.error("SendAttachment Failed:", err.response ? err.response.data : err.message);
      return false;
    }
  };
};
