# amduspage

![NodeJS](https://img.shields.io/badge/node.js-black?style=flat-square&logo=nodedotjs) ![MongoDB](https://img.shields.io/badge/mongodb-black?style=flat-square&logo=mongodb) ![Express](https://img.shields.io/badge/express-black?style=flat-square&logo=express)

optimized messenger pagebot. runs on nodejs.
simple. fast. secure.

**maker**
[seth asher salinguhay](https://www.facebook.com/seth09asher)

---

## structure

- `modules/commands` — bot logic (ai, media, fun, etc)
- `modules/core` — database, cache & queue managers
- `modules/middleware` — rate limiting & validation
- `page/src` — facebook api wrappers (carousel, buttons, etc)
- `config/` — api endpoints & constants
- `index.js` — main entry point

---

## setup

**1. basic config**
fill `config/config.json` with your prefix and bot name.

**2. environment variables**
set these in your host (Render/Railway/Replit) or `.env` file:

| variable | description |
| :--- | :--- |
| `PAGE_ACCESS_TOKEN` | facebook page token |
| `VERIFY_TOKEN` | webhook verification |
| `APP_SECRET` | app secret for security |
| `ADMINS` | your id (separated by comma) |
| `MONGODB_URI` | mongodb connection string |
| `CHIPP_API_KEY` | main ai key (amdus) |
| `CHIPP_MODEL` | ai model id |
| `GEMINI_COOKIE` | `__Secure-1PSID` for gemini |
| `MIMO_STUDIO_COOKIE` | cookie for mimo ai |
| `OPENROUTER_KEY` | key for molmo vision |
| `APY_TOKEN` | apyhub key for tempmail |
| `GOOGLE_API_KEY` | google search api |
| `GOOGLE_CX` | google search engine id |
| `NASA_API_KEY` | nasa photos |
| `WOLFRAM_APP_ID` | wolfram alpha id |
| `DICT_API_KEY` | merriam-webster key |

---

## deployment

**build command**
```bash
npm install
```

**start command**
```bash
node index.js
```

---

## commands

**ai**
`amdus <query>` — main ai (supports image/files).
`gemini <query>` — google gemini with vision.
`mimo <query>` — conversational ai with visual context.
`molmo <media>` — vision analysis for images/videos.
`copilot`, `perplexity`, `gpt5`, `blackbox` — other models.

**media**
`alldl <url>` — universal downloader (fb, tt, yt, etc).
`pinterest <query>` — search images (carousel).
`screenshot <url>` — capture website preview.
`lyrics <song>` — find song lyrics.
`dalle <prompt>` — generate images.

**utility**
`tempmail` — generate disposable emails.
`remind <time> <msg>` — set a reminder (e.g. 10m).
`translate <lang> <text>` — translate text and audio.
`dict`, `google`, `wiki`, `wolfram` — information tools.

**admin**
`stats` — check ram, uptime, and user count.
`getuser` — view or sync user database.
`ban`/`unban` — manage user access.
`broadcast <msg>` — send announcement to all users.
`maintenance on/off` — toggle bot availability.
`clean` — purge old cache files.

---

made by sethdico.
