<div align="center">

  <img src="https://media.tenor.com/D_vC5l2w8a0AAAAC/nazo-no-kanojo-x-urabe-mikoto.gif" width="600" style="border-radius: 10px; box-shadow: 0px 5px 15px rgba(0,0,0,0.3);">

  # AMDUSPAGE

  ![NodeJS](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
  ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
  ![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)

  <p style="font-size: 1.1rem; color: #555;">
    <b>Optimized Messenger Pagebot.</b><br>
    Simple. Fast. Secure.
  </p>

  <p>
    Created by <a href="https://www.facebook.com/seth09asher"><b>Seth Asher Salinguhay</b></a>
  </p>

</div>

<br>

## 📂 Project Structure

A modular architecture designed for scalability and ease of maintenance.

| Directory | Description |
| :--- | :--- |
| `modules/commands` | **Bot Logic** (AI, Media, Fun, Utility) |
| `modules/core` | **System Core** (Database, Cache & Queue Managers) |
| `modules/middleware` | **Security** (Rate limiting & Input Validation) |
| `page/src` | **Interface** (Facebook API Wrappers: Carousel, Buttons) |
| `config/` | **Configuration** (API Endpoints & Constants) |
| `index.js` | **Entry Point** (Main Application File) |

---

## 🛠️ Setup & Configuration

### 1. Basic Configuration
Navigate to `config/config.json` to define your bot's prefix and display name.

### 2. Environment Variables
Configure the following keys in your hosting environment (Render/Railway/Replit) or a local `.env` file.

<details>
<summary><b>Click to view required variables</b></summary>

| Variable | Description |
| :--- | :--- |
| `PAGE_ACCESS_TOKEN` | Facebook Page Access Token |
| `VERIFY_TOKEN` | Webhook Verification Token |
| `APP_SECRET` | App Secret (for request signing) |
| `ADMINS` | Administrator UIDs (separated by comma) |
| `MONGODB_URI` | MongoDB Connection String |
| `CHIPP_API_KEY` | Amdus AI Main Key |
| `CHIPP_MODEL` | AI Model ID |
| `GEMINI_COOKIE` | Google Gemini `__Secure-1PSID` |
| `OPENROUTER_KEY` | Molmo Vision Key |
| `APY_TOKEN` | Apyhub Token (Tempmail) |
| `GOOGLE_API_KEY` | Google Search API Key |
| `GOOGLE_CX` | Google Search Engine ID |
| `NASA_API_KEY` | NASA Image API |
| `WOLFRAM_APP_ID` | Wolfram Alpha App ID |
| `DICT_API_KEY` | Merriam-Webster Dictionary Key |

</details>

---

## 🚀 Deployment

**1. Install Dependencies**
```bash
npm install
```

**2. Start Application**
```bash
node index.js
```

---

## 🤖 Feature List

### 🧠 Artificial Intelligence
*   `amdus <query>` — Main AI engine (supports image/file analysis).
*   `gemini <query>` — Google Gemini integration with vision capabilities.
*   `copilot`, `perplexity`, `gpt5` — Alternative LLM models.

### 🎬 Media Tools
*   `alldl <url>` — Universal media downloader (Facebook, TikTok, YouTube, etc).
*   `pinterest <query>` — Image search returning carousel results.
*   `screenshot <url>` — Captures a live preview of a website.
*   `dalle <prompt>` — AI image generation.
*   `lyrics <song>` — Fetches song lyrics.

### 🛠️ Utilities
*   `tempmail` — Generates disposable email addresses.
*   `remind <time> <msg>` — Sets a scheduled reminder (e.g., `10m`).
*   `translate <lang> <text>` — Translates text or audio inputs.
*   `dict`, `google`, `wiki`, `wolfram` — Knowledge and search tools.

### 🛡️ Administration
*   `stats` — Displays system metrics (RAM, Uptime, User Count).
*   `getuser` — Views or synchronizes the user database.
*   `ban` / `unban` — Manages user access permissions.
*   `broadcast <msg>` — Sends a global announcement to all users.
*   `maintenance on/off` — Toggles maintenance mode.
*   `clean` — Purges temporary cache files.

---

<div align="center">
    <br>
    Developed with ❤️ by Sethdico
</div>
