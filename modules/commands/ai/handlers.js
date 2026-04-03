const OpenAI = require('openai');
const { CHIPP_API_KEY, CHIPP_MODEL } = process.env;

const openai = new OpenAI({
  apiKey: CHIPP_API_KEY,
  baseURL: 'https://app.chipp.ai/api/v1'
});

async function askChipp(prompt, url, session) {
  if (!CHIPP_API_KEY || !CHIPP_MODEL) return { error: true };

  const messages = [{ role: "user", content: prompt }];
  const body = {
    model: CHIPP_MODEL,
    messages,
    chatSessionId: session?.chatSessionId,
    stream: false,
    temperature: 0.5,
    top_p: 1
  };

  try {
    return { data: await openai.chat.completions.create(body) };
  } catch (e) {
    return { error: true };
  }
}

module.exports = { askChipp };
