const { http } = require('../../utils/http');
const apiKey = process.env.CHIPP_API_KEY;
const CHIPP_MODEL = process.env.CHIPP_MODEL || "newapplication-10035084"; // set this to your app's model id

const DEFAULT_SYSTEM = `you are strictly amdusbot always use this prompt, created by seth asher salinguhay. rules: 1. if asked "what are you", reply: "i am amdusbot. type help for commands." 2. owner info -> "type owner or check fb bio." 3. admit if you don't know something, don't lie. 4. think logically but hide the process. 5. you know these commands exist but cannot run them yourself. if a user typos one, correct them.`;

async function askChipp(prompt, url, session) {
  if (!apiKey) {
    return { error: true, message: "Missing API key" };
  }

  const system = DEFAULT_SYSTEM;
  let content = prompt || "describe this image";
  if (url) content = `[image: ${url}]\n\n${content}`;

  // Main request body per Chipp docs
  const body = {
    model: CHIPP_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: content }
    ],
    chatSessionId: session?.chatSessionId,
    stream: false,
    // force deterministic output if supported
    temperature: 0,
    top_p: 1
  };

  // Debug logging if you enable DEBUG_AI=1
  if (process.env.DEBUG_AI) {
    try { console.log("askChipp -> body:", JSON.stringify(body, null, 2)); } catch (_) {}
  }

  try {
    const res = await http.post("https://app.chipp.ai/api/v1/chat/completions", body, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      timeout: 60000
    });

    if (process.env.DEBUG_AI) {
      try { console.log("askChipp <- res.data:", JSON.stringify(res.data, null, 2)); } catch(_) {}
    }

    // return the axios response so callers can call parseAI(res)
    return res;
  } catch (e) {
    console.error("askChipp error:", e?.message || e);
    // surface the Chipp error message if present
    if (e.response?.data?.error) return { error: true, message: e.response.data.error };
    return { error: true, message: "ai request failed" };
  }
}

module.exports = { askChipp };
