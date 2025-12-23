const axios = require("axios");
const { API_VERSION } = require("../../config.json");

module.exports = (event) =>
  async function setMessageReaction(reaction, messageId) {
    const mid = messageId || event.message?.mid;
    const recipientID = event.sender?.id;

    if (!mid || !recipientID) return;

    // Map emojis to reaction names if necessary (for Instagram compatibility)
    // Facebook Pages formally DO NOT support reactions via API, but this structure works for Instagram
    const reactionMap = {
      "✅": "like",
      "👍": "like",
      "❤️": "love",
      "😆": "laugh",
      "😮": "wow",
      "😢": "sad",
      "😠": "angry"
    };

    const action = reactionMap[reaction] || "like";

    try {
      // 1. Attempt standard "Sender Action" structure (Used by Instagram/Workplace)
      await axios.post(
        `https://graph.facebook.com/${API_VERSION}/me/messages?access_token=${global.PAGE_ACCESS_TOKEN}`,
        {
          recipient: { id: recipientID },
          sender_action: "react",
          payload: {
            message_id: mid,
            reaction: action
          }
        }
      );
    } catch (err) {
      // 2. FALLBACK: If Reaction fails (likely because it's a FB Page), just Mark as Seen
      // This prevents the error "Bad Request" from cluttering your console
      try {
        await axios.post(
            `https://graph.facebook.com/${API_VERSION}/me/messages?access_token=${global.PAGE_ACCESS_TOKEN}`,
            {
              recipient: { id: recipientID },
              sender_action: "mark_seen"
            }
        );
      } catch (e) { /* Ignore fallback errors */ }
    }
  };
