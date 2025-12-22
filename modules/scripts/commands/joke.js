const axios = require("axios");

module.exports.config = {
  name: "joke",
  author: "Sethdico",
  version: "1.5",
  category: "Fun",
  description: "Get a random joke.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event }) {
  const senderID = event.sender.id;

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    const res = await axios.get("https://official-joke-api.appspot.com/random_joke");
    const { setup, punchline } = res.data;

    await api.sendMessage(`🤣 **Joke Time!**\n\n${setup}`, senderID);

    setTimeout(async () => {
      await api.sendMessage(`👉 ${punchline}`, senderID);
    }, 3000);

  } catch (e) {
    api.sendMessage("❌ Couldn't fetch a joke right now.", senderID);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
