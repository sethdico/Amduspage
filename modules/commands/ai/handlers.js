const PRIMARY_CHIPPAI_API = 'https://amdusbot-10037381.chipp.ai/api/chat';
const FALLBACK_CHIPPAI_API = 'https://app.chipp.ai/api/chat';
const APP_ID = 'Amdusbot-10037381';
const API_TIMEOUT_MS = 45000;
const DEFAULT_ERROR_MSG = "I'm having trouble connecting right now. Please try again.";

async function readStream(response) {
  if (!response.body) return await response.text();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let emptyReads = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    if (!value) {
      emptyReads++;
      if (emptyReads > 100) break;
      continue;
    }

    full += decoder.decode(value, { stream: true });
  }
  return full;
}

function normalizeEvents(raw) {
  if (!raw || typeof raw !== 'string') return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}

  return raw
    .split(/\r?\n/)
    .filter(line => line.trim() && line.trim().startsWith('data:'))
    .map(line => {
      try {
        const jsonStr = line.replace(/^data:\s*/, '').trim();
        if (jsonStr === '[DONE]') return null;
        return JSON.parse(jsonStr);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function parseEventStream(raw) {
  const events = normalizeEvents(raw);
  
  let resultMsg = '';
  let toolOutputBuffer = '';
  const images = new Set();
  
  for (const evt of events) {
    if (!evt) continue;

    if (evt.type === 'text-delta' && evt.delta) {
      resultMsg += evt.delta;
    }
    else if (evt.content && typeof evt.content === 'string') {
      resultMsg += evt.content;
    }

    if (evt.type === 'tool-output-available' && evt.output) {
      const out = evt.output;

      if (Array.isArray(out)) {
        out.forEach(item => {
          if (item.type === 'message' && Array.isArray(item.content)) {
            item.content.forEach(c => {
              if (c.type === 'output_text' && c.text) {
                toolOutputBuffer += c.text + '\n';
              }
            });
          }
          if (item.metadata?.screenshotUrl) images.add(item.metadata.screenshotUrl);
        });
      } 
      else if (typeof out === 'object') {
        if (out.metadata?.screenshotUrl) images.add(out.metadata.screenshotUrl);
        if (out.summary) toolOutputBuffer += out.summary + '\n';
      }
    }
  }

  if (resultMsg) {
    const urlRegex = /https:\/\/storage\.googleapis\.com\/chipp-images\/[^\s)\]]+/gi;
    const found = resultMsg.match(urlRegex);
    if (found) {
      found.forEach(url => {
        const cleanUrl = url.replace(/[).,]+$/, ''); 
        images.add(cleanUrl);
      });
    }
  }

  let finalMessage = resultMsg.trim();
  
  if (!finalMessage && toolOutputBuffer.trim()) {
    finalMessage = toolOutputBuffer.trim();
  }

  if (finalMessage.includes("</think>")) {
    finalMessage = finalMessage.split("</think>")[1].trim();
  }

  return { 
    message: finalMessage, 
    images: [...images] 
  };
}

async function sendToChipp(apiUrl, payload, returnRaw = false) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        accept: '*/*',
        'content-type': 'application/json',
        'x-app-name-id': APP_ID,
        'user-agent': 'Mozilla/5.0'
      },
      credentials: 'include',
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const raw = await readStream(response);
    
    if (!raw || raw.trim().length === 0) {
      throw new Error('Received empty response body from API');
    }

    if (returnRaw) return raw;

    const parsed = parseEventStream(raw);
    
    if (!parsed.message && parsed.images.length === 0) {
       if (raw.includes('error')) throw new Error('API returned an error object');
       throw new Error('Parsed response was blank');
    }

    return parsed;

  } finally {
    clearTimeout(timeoutId);
  }
}

async function askChipp(prompt, url, history = [], session) {
  const CHAT_SESSION_ID = session?.chatSessionId || process.env.CHIPP_SESSION_ID;

  let imageUrls = [];
  if (url) {
    imageUrls = Array.isArray(url) ? url : [url];
  }

  const userMessageContent = imageUrls.length
    ? `${prompt} ${imageUrls.join(' ')}`
    : prompt;

  const messages = [...history, { role: 'user', content: userMessageContent }];

  const payload = {
    id: Math.random().toString(36).slice(2),
    chatSessionId: CHAT_SESSION_ID,
    messages
  };

  let result = null;
  try {
    result = await sendToChipp(PRIMARY_CHIPPAI_API, payload);
    return result;
  } catch (primaryErr) {
    console.warn(`[CHIPP] Primary API Failed: ${primaryErr.message}`);
  }

  try {
    result = await sendToChipp(FALLBACK_CHIPPAI_API, payload);
    return result;
  } catch (fallbackErr) {
    console.error('[CHIPP] Fallback API Failed:', fallbackErr.message);
  }

  return { 
    error: true, 
    message: DEFAULT_ERROR_MSG,
    images: [] 
  };
}

module.exports = { askChipp };
