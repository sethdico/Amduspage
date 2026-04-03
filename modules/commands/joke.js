const { http } = require("../utils");

module.exports.config = {
    name: "joke",
    author: "Sethdico",
    version: "4.0",
    category: "Fun",
    description: "Random jokes with flow.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 2,
};

module.exports.run = async function ({ event, api }) {
  try {
    const res = await http.get("https://official-joke-api.appspot.com/random_joke");
    const msg = `🤣 ${res.data.setup}\n\n👉 ${res.data.punchline}`;
    const buttons = [{ type: "postback", title: "🔄 Another One", payload: "joke" }];

    api.sendButton(msg, buttons, event.sender.id);
  } catch (e) {
    api.sendMessage("🤣 why did the bot fail? because the api was down", event.sender.id);
  }
};
