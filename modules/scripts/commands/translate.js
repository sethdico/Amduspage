const axios = require("axios");

module.exports.config = {
  name: "translate",
  author: "Sethdico",
  version: "2.0-Enhanced",
  category: "Utility",
  description: "Smart translate - auto-detects language or specify target.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 3,
};
const LANGUAGES = {
  en: "English",
  tl: "Tagalog",
  jp: "Japanese",
  ja: "Japanese",
  fr: "French",
  es: "Spanish",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ru: "Russian",
  zh: "Chinese",
  ko: "Korean",
  ar: "Arabic",
  hi: "Hindi",
  th: "Thai",
  vi: "Vietnamese",
  id: "Indonesian",
  nl: "Dutch",
  pl: "Polish",
  tr: "Turkish",
  sv: "Swedish",
  no: "Norwegian",
  da: "Danish",
  fi: "Finnish",
};
module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender.id;
if (args[0]?.toLowerCase() === "codes" || args[0]?.toLowerCase() === "list") {
    let msg = "🌐 **SUPPORTED LANGUAGES**\n━━━━━━━━━━━━━━━━\n";
const langEntries = Object.entries(LANGUAGES);
    for (let i = 0; i < langEntries.length; i += 2) {
      const [code1, name1] = langEntries[i];
const line = `${code1}: ${name1}`;

      if (i + 1 < langEntries.length) {
        const [code2, name2] = langEntries[i + 1];
msg += `${line.padEnd(20)} ${code2}: ${name2}\n`;
      } else {
        msg += `${line}\n`;
}
    }

    msg += `\n━━━━━━━━━━━━━━━━\n💡 Usage:\n• translate Hello (auto → English)\n• translate es Hello (English → Spanish)\n• translate jp こんにちは (Japanese → English)`;
return api.sendMessage(msg, senderID);
  }

  if (!args.length) {
    return api.sendMessage(
      "⚠️ **Usage:**\n• translate [text] - Auto translate to English\n• translate [lang] [text] - Translate to specific language\n• translate list - Show language codes",
      senderID,
    );
}

  let targetLang = "en";
  let text = args.join(" ");
  let isAutoMode = true;
if (args[0].length <= 3 && args.length > 1) {
    const possibleLang = args[0].toLowerCase();
if (LANGUAGES[possibleLang]) {
      targetLang = possibleLang === "jp" ? "ja" : possibleLang;
// Google uses 'ja' for Japanese
      text = args.slice(1).join(" ");
      isAutoMode = false;
}
  }

  api.sendTypingIndicator(true, senderID);

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
const res = await axios.get(url, { timeout: 8000 });

    const translation = res.data[0].map((x) => x[0]).join("");
    const detectedLang = res.data[2] ||
"unknown";

    if (detectedLang === targetLang && translation.toLowerCase() === text.toLowerCase()) {
      api.sendTypingIndicator(false, senderID);
return api.sendMessage(
        `ℹ️ Text is already in ${LANGUAGES[targetLang] || targetLang}. Try a different target language.`,
        senderID,
      );
}

    const detectedName = LANGUAGES[detectedLang] || detectedLang.toUpperCase();
    const targetName = LANGUAGES[targetLang] || targetLang.toUpperCase();

    const audioLink = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(translation)}&tl=${targetLang}&client=tw-ob&ttsspeed=1`;
const buttons = [
      {
        type: "web_url",
        url: audioLink,
        title: "🔊 Listen",
      },
      {
        type: "postback",
        title: "🔄 Translate Back",
        payload: `translate ${detectedLang} ${translation}`,
      },
    ];
const msg = `🌐 **TRANSLATION**\n━━━━━━━━━━━━━━━━\n📥 **From [${detectedName}]:**\n${text}\n\n📤 **To [${targetName}]:**\n${translation}\n━━━━━━━━━━━━━━━━`;

    await api.sendButton(msg, buttons, senderID);
} catch (e) {
    console.error("[translate.js] Error:", e.message);
api.sendMessage(`❌ Translation failed. ${e.response ? "API error." : "Network timeout."}`, senderID);
  } finally {
    api.sendTypingIndicator(false, senderID);
  }
};
