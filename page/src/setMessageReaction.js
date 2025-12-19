const axios = require("axios");

module.exports = function (event) {
  return function setMessageReaction(reaction, messageId) {
    // If no messageId provided, try to use the current event's message ID
    const mid = messageId || event.message?.mid;
    
    if (!mid) return Promise.resolve();

    return axios.post(
      `https://graph.facebook.com/v20.0/${mid}/reactions?access_token=${global.PAGE_ACCESS_TOKEN}`,
      {
        reaction: reaction,
      }
    ).catch((err) => {
      console.error("Reaction Error:", err.response ? err.response.data : err.message);
    });
  };
};
