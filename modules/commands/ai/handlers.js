async function readStream(response) {
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

function parseEventStream(raw) {
    if (!raw) return { message: "", images: [] };

    const events = raw.split(/\r?\n/)
        .filter(line => line.trim().startsWith('data:'))
        .map(line => {
            try {
                const jsonStr = line.replace(/^data:\s*/, '').trim();
                return jsonStr === '[DONE]' ? null : JSON.parse(jsonStr);
            } catch { return null; }
        }).filter(Boolean);

    let resultMsg = '';
    let toolBuffer = '';
    const images = new Set();

    for (const evt of events) {
        if (evt.type === 'text-delta' && evt.delta) resultMsg += evt.delta;
        else if (evt.content && typeof evt.content === 'string') resultMsg += evt.content;

        if (evt.type === 'tool-output-available' && evt.output) {
            const out = Array.isArray(evt.output) ? evt.output : [evt.output];
            out.forEach(item => {
                if (item.type === 'message' && Array.isArray(item.content)) {
                    item.content.forEach(c => { if (c.type === 'output_text') toolBuffer += c.text + '\n'; });
                }
                if (item.metadata?.screenshotUrl) images.add(item.metadata.screenshotUrl);
            });
        }
    }

    const urlRegex = /https:\/\/storage\.googleapis\.com\/chipp-images\/[^\s)\]]+/gi;
    const found = resultMsg.match(urlRegex);
    if (found) found.forEach(url => images.add(url.replace(/[).,]+$/, '')));

    let finalMsg = resultMsg.trim() || toolBuffer.trim();
    if (finalMsg.includes("</think>")) finalMsg = finalMsg.split("</think>")[1].trim();

    return { message: finalMsg, images: [...images] };
}

async function askChipp(prompt, url, history = [], session) {
    const API_URL = process.env.CHIPP_API_URL;
    const APP_ID = process.env.CHIPP_APP_ID;
    const SESSION_ID = session?.chatSessionId || process.env.CHIPP_SESSION_ID;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    let content = prompt || "describe this image";
    if (url) content = `[image: ${url}]\n\n${content}`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'accept': '*/*',
                'content-type': 'application/json',
                'x-app-name-id': APP_ID,
                'user-agent': 'Mozilla/5.0'
            },
            body: JSON.stringify({
                id: Math.random().toString(36).slice(2),
                chatSessionId: SESSION_ID,
                messages: [...history, { role: "user", content: content }]
            }),
            signal: controller.signal
        });

        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const rawData = await readStream(response);
        return parseEventStream(rawData);
    } catch (e) {
        return { error: true, message: `Connection failed: ${e.message}` };
    } finally {
        clearTimeout(timeout);
    }
}

module.exports = { askChipp };
