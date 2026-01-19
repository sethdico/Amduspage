const { http, cachedRequest, chunkText, sanitize } = require("../utils");
const API_URLS = require("../../config/apis");

const PERPLEXITY_URL = API_URLS.perplexity || "https://perplexity-aiv1-g1ib.onrender.com/search";
const DEBUG = !!process.env.DEBUG_PERP;
const MAX_QUERY_LENGTH = 500; 
const CACHE_TTL = 10 * 60 * 1000; 

module.exports.config = {
  name: "perplexity",
  author: "sethdico",
  version: "1.1",
  category: "AI",
  description: "Search Perplexity for a short answer (perplexity <query>)",
  adminOnly: false,
  usePrefix: false,
  cooldown: 0 
};

module.exports.run = async function ({ event, args, api, reply }) {
  const sender = event.sender.id;
  const rawQuery = (args || []).join(" ").trim();

  // basic validation
  if (!rawQuery) return reply("Usage: perplexity <question>");
  if (rawQuery.length > MAX_QUERY_LENGTH) return reply(`Question too long (max ${MAX_QUERY_LENGTH} chars).`);
  const query = sanitize(rawQuery);

  // typing indicator
  if (api.sendTypingIndicator) try { api.sendTypingIndicator(true, sender).catch(()=>{}); } catch(_) {}

  try {
    // prefer cachedRequest if available to reduce duplicate calls
    let res;
    if (typeof cachedRequest === "function") {
      res = await cachedRequest(PERPLEXITY_URL, { params: { query } }, CACHE_TTL);
    } else {
      res = await http.get(PERPLEXITY_URL, { params: { query }, timeout: 30000 });
    }

    // normalize axios response vs direct object
    const data = res?.data ?? res;
    if (DEBUG) {
      try { console.log("[perplexity] raw response:", JSON.stringify(data, null, 2)); } catch (_) {}
    }

    if (!data) return reply("No response from Perplexity.");
    if (data.error) return reply(`Perplexity error: ${data.error}`);

    // Per the sample API, `answer` is the common field; fallback to other likely fields.
    let answer = data.answer || data.result || data.response || data.text || (typeof data === "string" ? data : null);
    if (!answer) {
      if (data.result && typeof data.result === "object") {
        answer = data.result.answer || data.result.text || null;
      }
    }

    if (!answer) return reply("Perplexity returned no answer for that query.");

    // send chunked answer (handles platform length limits)
    const chunks = chunkText(String(answer));
    for (const c of chunks) {
      // reply returns a promise in most code paths — await to preserve order
      await reply(c);
    }

    // attach short list of sources if available
    const rawSources = data.sources || data.citations || data.links || data.meta?.sources || data.references;
    if (Array.isArray(rawSources) && rawSources.length > 0) {
      const sources = rawSources
        .map(s => {
          if (!s) return null;
          if (typeof s === "string") return s;
          if (s.url) return s.url;
          if (s.link) return s.link;
          if (s.href) return s.href;
          return null;
        })
        .filter(Boolean)
        .slice(0, 3); 

      if (sources.length) {
        await reply("Sources:\n" + sources.join("\n"));
      }
    }

  } catch (e) {
    if (DEBUG) console.error("[perplexity] error:", e);
    const status = e?.response?.status;
    if (status === 400) return reply("Perplexity: invalid request.");
    if (status === 401) return reply("Perplexity: authentication required or invalid key.");
    if (status === 404) return reply("Perplexity: endpoint not found.");
    if (status === 429) return reply("Perplexity is busy right now — try again in a bit.");
    if (status && status >= 500) return reply("Perplexity service error. Try again later.");
    return reply("Perplexity request failed. Try again later.");
  } finally {
    if (api.sendTypingIndicator) try { api.sendTypingIndicator(false, sender).catch(()=>{}); } catch(_) {}
  }
};
