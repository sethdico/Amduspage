const axios = require("axios");

module.exports = function (event) {
  return async function setMessageReaction(reaction, messageId) {
    const mid = messageId || event.message?.mid;
    const recipientID = event.sender?.id;

    if (!mid || !recipientID) return;

    try {
      await axios.post(
        `https://graph.facebook.com/v21.0/me/messages?access_token=${global.PAGE_ACCESS_TOKEN}`,
        {
          recipient: { id: recipientID },
          sender_action: "react",
          payload: {
            message_id: mid,
            reaction: reaction
          }
        }
      );
    } catch (err) {
      console.error("Reaction Error:", err.response ? err.response.data : err.message);
    }
  };
};
