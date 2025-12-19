const axios = require("axios");

module.exports = function (event) {
  return function sendAttachment(type, url, senderID) {
    const recipientID = senderID || event.sender.id;

    // Map "image", "audio", "video" to proper Facebook format
    // If it's a file, Facebook expects "file"
    // Note: This simple version handles URLs. 
    
    const messagePayload = {
      recipient: { id: recipientID },
      message: {
        attachment: {
          type: type === "photo" ? "image" : type, 
          payload: { 
            url: url, 
            is_reusable: true 
          }
        }
      }
    };

    return axios.post(
      `https://graph.facebook.com/v20.0/me/messages?access_token=${global.PAGE_ACCESS_TOKEN}`,
      messagePayload
    ).catch((err) => {
      console.error("Send Attachment Error:", err.response ? err.response.data : err.message);
    });
  };
};
