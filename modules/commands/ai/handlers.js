const { http } = require('../../utils/http');

function parseEventStream(raw) {
    if (!raw) return { message: "", images: [] };
    
    const events = raw.split(/\r?\n/)
        .filter(line => line.trim().startsWith('data:'))
        .map(line => {
            try {
                const jsonStr = line.replace(/^data:\s*/, '').trim();
                return jsonStr === '[DONE]' ? null : JSON.parse(jsonStr);
            } catch (e) { return null; }
        }).filter(Boolean);

    let resultMsg = '';
    let toolOutputBuffer = '';
    const images = new Set();

    for (const evt of events) {
        if (evt.type === 'text-delta' && evt.delta) {
            resultMsg += evt.delta;
        } else if (evt.content && typeof evt.content === 'string') {
            resultMsg += evt.content;
        }

        if (evt.type === 'tool-output-available' && evt.output) {
            const out = Array.isArray(evt.output) ? evt.output : [evt.output];
            out.forEach(item => {
                if (item.type === 'message' && Array.isArray(item.content)) {
                    item.content.forEach(c => { 
                        if (c.type === 'output_text') toolOutputBuffer += c.text + '\n'; 
                    });
                }
                if (item.metadata?.screenshotUrl) images.add(item.metadata.screenshotUrl);
            });
        }
    }

    const urlRegex = /https:\/\/storage\.googleapis\.com\/chipp-images\/[^\s)\]]+/gi;
    const found = resultMsg.match(urlRegex);
    if (found) found.forEach(url => images.add(url.replace(/[).,]+$/, '')));

    let finalMessage = resultMsg.trim() || toolOutputBuffer.trim();

    if (finalMessage.includes("</think>")) {
        finalMessage = finalMessage.split("</think>")[1].trim();
    }

    return { message: finalMessage, images: [...images] };
}

async function askChipp(prompt, url, history = [], session) {
    const chatSessionId = session?.chatSessionId || process.env.CHIPP_SESSION_ID;

    let content = prompt || "describe this image";
    if (url) content = `[image: ${url}]\n\n${content}`;

    const payload = {
        id: Math.random().toString(36).slice(2),
        chatSessionId: chatSessionId,
        messages: [...history, { role: "user", content: content }]
    };

    try {
        const response = await http.post(process.env.CHIPP_API_URL, payload, {
            headers: {
                'accept': '*/*',
                'content-type': 'application/json',
                'x-app-name-id': process.env.CHIPP_APP_ID
            }
        });

        const rawData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        return parseEventStream(rawData);
    } catch (e) {
        return { error: true, message: "Amdus unavailable." };
    }
}

module.exports = { askChipp };
