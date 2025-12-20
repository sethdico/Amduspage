const axios = require("axios");
const { API_VERSION } = require("../../config.json");

module.exports = function (event) {
  return async function sendMessage(text, senderID) {
    const recipientID = senderID || event.sender.id;
    const accessToken = global.PAGE_ACCESS_TOKEN;

    if (!text) return;

    // Split text into chunks of 1900 characters (to stay safe under 2000 limit)
    const chunks = text.match(/[\s\S]{1,1900}/g) || [];

    for (const chunk of chunks) {
      try {
        await axios.post(
          `https://graph.facebook.com/${API_VERSION}/me/messages?access_token=${accessToken}`,
          {
            recipient: { id: recipientID },
            message: { text: chunk },
            messaging_type: "RESPONSE"
          }
        );
      } catch (e) {
        console.error("SendMessage Chunk Error:", e.response?.data || e.message);
      }
    }
  };
};
