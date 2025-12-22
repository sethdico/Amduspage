const axios = require("axios")
const { API_VERSION } = require("../../config.json")

module.exports = (event) =>
  async function setMessageReaction(reaction, messageId) {
    const mid = messageId || event.message?.mid
    const recipientID = event.sender?.id

    if (!mid || !recipientID) {
      console.error("Reaction Error: Missing message ID or recipient ID")
      return
    }

    try {
      const response = await axios.post(
        `https://graph.facebook.com/${API_VERSION}/me/messages?access_token=${global.PAGE_ACCESS_TOKEN}`,
        {
          recipient: { id: recipientID },
          message_id: mid,
          reaction: reaction || "", // Empty string removes reaction
        },
      )

      console.log(`[v0] Reaction sent successfully: ${reaction} on message ${mid}`)
      return response.data
    } catch (err) {
      console.error("Reaction Error:", err.response?.data || err.message)
      console.error("Attempted reaction:", reaction, "on message:", mid)

      return null
    }
  }
