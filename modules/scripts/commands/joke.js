const axios = require("axios");
module.exports.config = {
  name: "joke",
  author: "Sethdico",
  version: "1.1",
  category: "Fun",
  description: "Get a random joke (programming, general, etc.)",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};
module.exports.run = async function ({ event, args }) {
  const senderID = event.sender.id;
  const type = args[0]?.toLowerCase(); // e.g., 'programming' or 'general'
  // Valid types/endpoints logic
  const apiUrl = type ? `https:                                                                                                             
  try {
    const response = await axios.get(apiUrl);
    let jokeData = response.data;
                                                       
    if (Array.isArray(jokeData)) jokeData = jokeData[0];
    if (!jokeData || !jokeData.setup) {
      return api.sendMessage(`//official-joke-api.appspot.com/jokes/${type}/random` : `https://official-joke-api.appspot.com/jokes/random`;
  try {
    const response = await axios.get(apiUrl);
    let jokeData = response.data;
    // API sometimes returns an array even for one joke
    if (Array.isArray(jokeData)) jokeData = jokeData[0];
    if (!jokeData || !jokeData.setup) {
      return api.sendMessage(`❌ I couldn't find a joke for type: "${type}". Try "general" or "programming".`, senderID);
    }
                        
    await api.sendMessage(`// 1. Send the Setup
    await api.sendMessage(`🤡 **JOKE (${jokeData.type.toUpperCase()})**\n━━━━━━━━━━━━━━━━\n${jokeData.setup}`, senderID);
                                                              
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);
    setTimeout(async () => {
                              
      const msg = `// 2. Comedic Timing: Wait 3 seconds with typing indicator
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);
    setTimeout(async () => {
      // 3. Send the Punchline
      const msg = `😆 **${jokeData.punchline}**`;
      const buttons = [
        { type: "postback", title: "🎲 Another One", payload: type ? `joke ${type}` : "joke" }
      ];
      await api.sendButton(msg, buttons, senderID);
      if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }, 3000);
  } catch (error) {
    api.sendMessage("❌ The joke machine is broken. Try again later!", senderID);
  }
};
