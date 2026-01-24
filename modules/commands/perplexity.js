const { http, chunkText, sanitize } = require("../utils");
const API_URLS = require("../../config/apis");

module.exports.config = {
  name: "perplexity",
  author: "sethdico",
  version: "1.1",
  category: "AI",
  description: "Search Perplexity for a short answer",
  adminOnly: false,
  usePrefix: false,
  cooldown: 0 
};

module.exports.run = async function ({ event, args, api, reply }) {
  const sender = event.sender.id;
  const rawQuery = (args || []).join(" ").trim();

  if (!rawQuery) return reply("Usage: perplexity <question>");
  const query = sanitize(rawQuery);
  if (api.sendTypingIndicator) try { api.sendTypingIndicator(true, sender).catch(()=>{}); } catch(_) {}

  try {
    const res = await http.get(API_URLS.perplexity || "https://perplexity-aiv1-g1ib.onrender.com/search", { params: { query }, timeout: 30000 });
    const data = res?.data ?? res;
    if (!data) return reply("No response from Perplexity.");

    let answer = data.answer || data.result || data.response || data.text;
    if (!answer) return reply("Perplexity returned no answer.");

    const chunks = chunkText(`🔍 **Perplexity**\n────────────────\n${String(answer)}`);
    for (const c of chunks) await reply(c);

    const rawSources = data.sources || data.citations || data.links;
    if (Array.isArray(rawSources) && rawSources.length > 0) {
      const sources = rawSources.map(s => s.url || s.link || s).filter(Boolean).slice(0, 3);
      if (sources.length) await reply("Sources:\n" + sources.join("\n"));
    }
  } catch (e) {
    reply("Perplexity request failed.");
  } finally {
    if (api.sendTypingIndicator) try { api.sendTypingIndicator(false, sender).catch(()=>{}); } catch(_) {}
  }
};
