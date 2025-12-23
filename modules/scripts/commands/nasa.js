const axios = require("axios");

module.exports.config = {
  name: "nasa",
  author: "Sethdico",
  version: "4.1",
  category: "Fun",
  description: "NASA Astronomy updates.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender.id;
  const isRandom = args[0]?.toLowerCase() === "random";

  try {
    if (isRandom) {
      const res = await axios.get(`https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&count=5`);
      const elements = res.data.filter(i => i.media_type === "image").map(item => ({
        title: item.title,
        subtitle: item.date,
        image_url: item.url,
        buttons: [{ type: "web_url", url: item.hdurl || item.url, title: "View HD" }]
      }));
      return api.sendCarousel(elements, senderID);
    }

    const res = await axios.get(`https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY`);
    const data = res.data;
    const msg = `🌌 **${data.title}**\n${data.explanation.substring(0, 300)}...`;

    if (data.media_type === "image") {
      await api.sendAttachment("image", data.url, senderID);
    }
    api.sendMessage(msg, senderID);
  } catch (e) {
    api.sendMessage("❌ NASA API error.", senderID);
  }
};
