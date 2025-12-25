const { http } = require("../../utils");

const LANGUAGES = {
  en: "English", tl: "Tagalog", ja: "Japanese", fr: "French", es: "Spanish",
  ko: "Korean", ar: "Arabic", zh: "Chinese"
};

module.exports.config = {
  name: "translate",
  author: "Sethdico",
  version: "2.1-Fast",
  category: "Utility",
  description: "Translate text.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 2,
};

module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender.id;
  if (!args.length) return api.sendMessage("⚠️ Usage: translate [lang] [text]", senderID);

  let targetLang = "en";
  let text = args.join(" ");

  // Check if first word is a language code (e.g., 'tl', 'ko')
  if (args[0].length === 2 && LANGUAGES[args[0].toLowerCase()]) {
    targetLang = args[0].toLowerCase();
    text = args.slice(1).join(" ");
  }

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID).catch(() => {});

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await http.get(url);

    const translation = res.data[0].map((x) => x[0]).join("");
    const detected = res.data[2] || "auto";

    const msg = `🌐 **TRANSLATE** (${detected.toUpperCase()} ➝ ${targetLang.toUpperCase()})\n━━━━━━━━━━━━━━━━\n${translation}`;
    
    await api.sendMessage(msg, senderID);

    // Audio pronunciation
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(translation)}&tl=${targetLang}&client=tw-ob`;
    api.sendAttachment("audio", audioUrl, senderID).catch(() => {});

  } catch (e) {
    api.sendMessage("❌ Translation failed.", senderID);
  }
};
