<div align="center">

  <img src="https://media1.tenor.com/m/Mq6ZeawKT1MAAAAd/nazo-no-kanojo-x-nazo-no-kanojo.gif" width="600" style="border-radius: 10px; box-shadow: 0px 5px 15px rgba(0,0,0,0.3);">

  # AMDUSPAGE

  ![NodeJS](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
  ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
  ![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
  ![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
  ![Version](https://img.shields.io/badge/Version-15.0.0-blue?style=for-the-badge)
  ![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

  <p style="font-size: 1.1rem; color: #555;">
    <b>Optimized Messenger Pagebot.</b><br>
    Fast, reliable, and community-driven.<br>
    <span style="background: rgba(255,255,255,0.12); color: #222; padding: 0.2rem 0.5rem; border-radius: 5px;">Live updates, modern AI pipeline, stable rate-limit handling.</span>
  </p>

  <p>
    Created by <a href="https://www.facebook.com/seth09asher"><b>Seth Asher Salinguhay</b></a> • school-project energy, build status maintained.
  </p>

  <div style="display:flex; justify-content:center; gap:0.5rem; align-items:center; flex-wrap:wrap;">
    <a href="#-deployment"><img src="https://img.shields.io/badge/Get%20Started-🚀-brightgreen?style=for-the-badge" alt="Get Started"></a>
    <a href="https://github.com/sethdico/Amduspage/commit" title="Latest Commit"><img src="https://img.shields.io/github/last-commit/sethdico/Amduspage?style=for-the-badge" alt="Last Commit"></a>
    <a href="https://github.com/sethdico/Amduspage/issues" title="Open Issues"><img src="https://img.shields.io/github/issues/sethdico/Amduspage?style=for-the-badge&color=orange" alt="Issues"></a>
  </div>

</div>

<br>

## 📋 Table of Contents
- [📂 Project Structure](#-project-structure)
- [🛠️ Setup & Configuration](#️-setup--configuration)
- [🚀 Deployment](#-deployment)
- [🤖 Feature List](#-feature-list)
- [📸 Demo](#-demo)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [⚠️ FAQ](#-faq)
- [📞 Support](#-support)
- [👍 Like & Review](#-like--review)

---

## 📂 Project Structure

A modular architecture designed for scalability and ease of maintenance.

| Directory | Description |
| :--- | :--- |
| `modules/commands/` | **Bot Logic** (AI, Media, Fun, Utility, Admin commands) |
| `modules/core/` | **System Core** (Database, Cache & Queue Managers) |
| `modules/middleware/` | **Security** (Rate limiting & Input Validation) |
| `modules/utils/` | **Utilities** (Helper functions and tools) |
| `page/src/` | **Interface** (Facebook API Wrappers: Carousel, Buttons, Messages) |
| `config/` | **Configuration** (API Endpoints & Constants) |
| `cache/` | **Cache Directory** (Temporary file storage) |
| `tests/` | **Test Suite** (Setup and test files) |
| `index.js` | **Entry Point** (Main Application File) |
| `webhook.js` | **Webhook Handler** (Facebook Messenger webhook processing) |

---

## 🛠️ Setup & Configuration

### Requirements
- **Node.js** >= 16.0.0
- **MongoDB** (for database)
- **SQLite** (for local storage)

### Installation

1. Clone the repository
2. Install dependencies with `npm install`
3. Configure `config/config.json` with your bot's prefix and name
4. Set up environment variables (see below)
5. Start with `node index.js`

### Environment Variables
Configure these in your hosting environment (Render/Railway/Replit) or local `.env` file.

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

You’re reading the real deal—this follows the repo files exactly and no fake commands. I’m keeping it 100% useful and low drama.

**Key Features:**
- **Zero-Prefix Logic**: Commands can be triggered anywhere in your message—no need for prefixes.
- **Tiered Ban System**: Progressive banning with escalating durations for repeated violations.
- **AI Fallback**: Any unrecognized message is processed by the AI assistant.

### 🧠 Artificial Intelligence

Here are the AI-related commands currently in this repo:
*   `gemini <query>` — Google Gemini integration with vision capabilities.
*   `copilot <prompt>` — Microsoft Copilot with search and source support.
*   `perplexity2 <query>` — Perplexity fallback behavior.
*   `venice <query>` — Venice AI model.
*   `webpilot <query>` — WebPilot AI assistant.
*   `you <query>` — You.com AI search.
*   `simsimi <message>` — SimSimi chatbot.
*   `gmage <prompt>` — Image generation helper.
*   `opendalle <prompt>` — DALL·E-style generation command.
*   `amdus <query>` — Main AI engine (if present in AI module path).

**Note:** The list is kept in sync with existing command files in `modules/commands/`—no unsupported mystery commands.  

### 🎬 Media Tools
*   `alldl <url>` — Universal media downloader (Facebook, TikTok, YouTube, etc).
*   `pinterest <query>` — Image search returning image results.
*   `screenshot <url>` — Captures a live preview of a website.
*   `dalle <prompt>` — AI image generation (OpenDALL-E).
*   `lyrics <song>` — Fetches song lyrics.
*   `nasa` — NASA image of the day.

### 🛠️ Utilities
*   `tempmail` — Generates disposable email addresses.
*   `remind <time> <msg>` — Sets a scheduled reminder (e.g., `10m`).
*   `translate <lang> <text>` — Translates text or audio inputs.
*   `dict <word>`, `google <query>`, `wiki <topic>`, `wolfram <query>` — Knowledge and search tools.
*   `bible <verse>` — Bible verse lookup.
*   `joke` — Random jokes.
*   `pokemon <name>` — Pokémon information.
*   `48laws <number>` — 48 Laws of Power reference.
*   `transcript` — View AI conversation history.

### 🛡️ Administration
*   `stats` — Displays system metrics (RAM, Uptime, User Count).
*   `getuser` — Views or synchronizes the user database.
*   `ban` / `unban` — Manages user access permissions.
*   `broadcast <msg>` — Sends a global announcement to all users.
*   `maintenance on/off` — Toggles maintenance mode.
*   `clean` — Purges temporary cache files.
*   `cmd` — Lists all available commands.

---

## 🚀 Use the pagebot here

Use the bot through the Facebook page: [https://www.facebook.com/profile.php?id=61585331824038](https://www.facebook.com/profile.php?id=61585331824038)

---

## 🤝 Contributing

Want to contribute? Follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

Ensure code quality and include tests where applicable.

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

You're free to use, modify, and distribute this software. Don't hold me liable if something breaks.

---

## ❓ FAQ

**Q: How do I set up the bot?**  
A: Follow the setup section above for installation and configuration steps.

**Q: Can I add my own commands?**  
A: Yes. Navigate to `modules/commands/` and add your command files following the existing structure.

**Q: What AI models are available?**  
A: The bot supports multiple models including Amdus, Gemini, Copilot, Perplexity, Venice, and others. Each serves different purposes and can be used as fallbacks.

**Q: Why am I getting errors?**  
A: Check your environment variables and logs for specific errors. Verify that all required API keys are configured correctly.

---

## 📞 Support

For issues or questions:

1. Check the logs and environment variables
2. Review existing issues on GitHub
3. Open a new issue with error details
4. Contact on [Facebook](https://www.facebook.com/seth09asher) for urgent matters

---

## 👍 Like & Review

If you find this bot useful, follow the [Facebook page](https://www.facebook.com/profile.php?id=61585331824038) and leave a review. Feel free to share it with your friends.

---

<div align="center">
    <br>
    Open-source and maintained by Sethdico<br>
    Feel free to share this page with your friends.
</div>
