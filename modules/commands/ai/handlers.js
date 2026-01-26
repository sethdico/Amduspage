const { http } = require('../../utils/http');
const { CHIPP_API_KEY, CHIPP_MODEL, DEBUG_AI } = process.env;

async function askChipp(prompt, url, session) {
  if (!CHIPP_API_KEY) return { error: true, message: "Missing CHIPP_API_KEY in .env" };
  if (!CHIPP_MODEL) return { error: true, message: "Missing CHIPP_MODEL in .env" };

  let content = prompt || "describe this image";
  if (url) content = `[image: ${url}]\n\n${content}`;

  const body = {
    model: CHIPP_MODEL,
    messages: [
      { role: "user", content: content }
    ],
    chatSessionId: session?.chatSessionId,
    stream: false,
    temperature: 0.5,
    top_p: 1
  };

  if (DEBUG_AI) {
    try { console.log("askChipp -> body:", JSON.stringify(body, null, 2)); } catch (_) {}
  }

  try {
    const res = await http.post("https://app.chipp.ai/api/v1/chat/completions", body, {
      headers: {
        "Authorization": `Bearer ${CHIPP_API_KEY}`,
        "Content-Type": "application/json"
      },
      timeout: 60000
    });

    if (DEBUG_AI) {
      try { console.log("askChipp <- res.data:", JSON.stringify(res.data, null, 2)); } catch(_) {}
    }

    return res;
  } catch (e) {
    console.error("askChipp error:", e?.message || e);
    const errorMsg = e.response?.data?.error || "ai request failed";
    return { error: true, message: errorMsg };
  }
}

module.exports = { askChipp };
