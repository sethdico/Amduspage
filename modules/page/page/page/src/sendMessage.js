const axios = require("axios");

module.exports = function (event) {
  return function sendMessage(text, senderID) {
    const recipientID = senderID || event.senderID;

    // Function to split the message into chunks
    function splitMessage(text) {
      const maxLength = 2000;
      const messages = [];
      let remainingText = text;

      while (remainingText.length > maxLength) {
        // Find the last newline character within the maxLength limit
        let splitIndex = remainingText.lastIndexOf("\n", maxLength);

        if (splitIndex === -1) {
          splitIndex = maxLength;
        } else {
          splitIndex += 1; // Include the newline character in the split
        }

        messages.push(remainingText.slice(0, splitIndex).trim());
        remainingText = remainingText.slice(splitIndex).trim();
      }

      messages.push(remainingText);
      return messages;
    }

    const messages = splitMessage(text);

    // Process each message chunk
    const sendPromises = messages.map(message => {
      const form = {
        recipient: { id: recipientID },
        message: { text: message },
        messaging_type: "RESPONSE",
      };

      return Graph(form);
    });

    // Return a single promise that resolves when all messages are sent
    return Promise.all(sendPromises)
      .then(results => results)
      .catch(err => {
        throw err;
      });
  };

  function Graph(form) {
    return axios
      .post(
        `https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
        form
      )
      .then((res) => res.data)
      .catch((err) => {
        throw err.response ? err.response.data : err.message;
      });
  }
};