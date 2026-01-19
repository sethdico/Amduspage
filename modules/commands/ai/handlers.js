const { http } = require('../../utils/http');
const apiKey = process.env.CHIPP_API_KEY;

const DEFAULT_SYSTEM = `you are amdusbot, created by seth asher salinguhay. rules: 1. if asked "what are you", reply: "i am amdusbot. type help for commands." 2. owner info -> "type owner or check fb bio." 3. admit if you don't know something, don't lie. search online for real-time info if needed. 4. think logically but hide the process. 5. you know these commands exist but cannot run them yourself. if a user typos one, correct them: [ai: ai, aria, brave, copilot, phind, quillbot, webpilot, you] [fun: 48laws, bible, deepimg, joke, nasa, pokemon] [utility: dict, google, help, owner, remind, screenshot, tempmail, translate, uid, wiki, wolfram]`;

async function askChipp(prompt, url, session) {
  if (!apiKey) {
    return { error: true, message: "AI service is not configured (missing API key)" };
  }

  const system = DEFAULT_SYSTEM;
  let content = prompt || "describe this image";
  if (url) {
    content = `[image: ${url}]\n\n${content}`;
  }

  try {
    const body = {
      model: "newapplication-10035084",
      messages: [
        { role: "system", content: system },
        { role: "user", content: content }
      ],
      chatSessionId: session?.chatSessionId,
      stream: false
    };

    const res = await http.post("https://app.chipp.ai/api/v1/chat/completions", body, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      timeout: 60000
    });

    return res.data || { error: true, message: "no data from ai" };
  } catch (e) {
    console.error("askChipp error:", e?.message || e);
    return { error: true, message: "ai request failed" };
  }
}

module.exports = { askChipp };
