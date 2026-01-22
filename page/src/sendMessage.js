const axios = require("axios");
const { API_VERSION } = require("../../config/config.json");

module.exports = function (event) {
  return async function sendMessage(text, senderID) {
    const recipientID = senderID || event.sender.id;
    if (!text) return;

    const content = String(text);

    // Smart splitting by newline or space to prevent cutting words in half
    const splitMessage = (text, maxLength = 1900) => {
      const chunks = [];
      let remaining = text;

      while (remaining.length > maxLength) {
        // Try to split at the last newline
        let splitAt = remaining.lastIndexOf('\n', maxLength);
        
        // If no newline, try space
        if (splitAt === -1) splitAt = remaining.lastIndexOf(' ', maxLength);
        
        // If no space (huge URL?), force split
        if (splitAt === -1) splitAt = maxLength;

        chunks.push(remaining.substring(0, splitAt));
        remaining = remaining.substring(splitAt).trim();
      }
      if (remaining) chunks.push(remaining);
      return chunks;
    };

    const chunks = splitMessage(content);

    for (const chunk of chunks) {
      try {
        await axios.post(
          `https://graph.facebook.com/${API_VERSION}/me/messages?access_token=${global.PAGE_ACCESS_TOKEN}`,
          {
            recipient: { id: recipientID },
            message: { text: chunk },
            messaging_type: "RESPONSE"
          }
        );
        // Small buffer to ensure messages arrive in order
        await new Promise(res => setTimeout(res, 250)); 
      } catch (e) {
        console.error("SendMessage Error:", e.message);
      }
    }
  };
};
