const axios = require("axios");

module.exports = function (event) {
  return function sendButton(text, buttons, senderID) {
    const recipientID = senderID || event.sender.id;
    
    // Lite rendering tip: Keep text under 100 chars to help it sit next to the button
    const safeText = text.length > 640 ? text.substring(0, 637) + "..." : text;

    const formattedButtons = buttons.slice(0, 3).map(btn => {
      if (btn.type === "web_url") {
        return { type: "web_url", url: btn.url, title: btn.title };
      }
      return { 
        type: "postback", 
        title: btn.title, 
        payload: btn.payload || btn.title.toUpperCase() 
      };
    });

    return axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${global.PAGE_ACCESS_TOKEN}`, {
      recipient: { id: recipientID },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "button", // Standard button template
            text: safeText,
            buttons: formattedButtons
          }
        }
      }
    }).catch(e => console.error("Lite-Compatible Button Fail"));
  };
};
