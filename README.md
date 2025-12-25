# amduspage

optimized messenger bot. runs on nodejs.

## structure
- modules/scripts/commands: bot commands
- page/src: api wrappers
- index.js: main entry point
- config.json: basic settings

## setup
1. fill `config.json` with your prefix and bot name.
2. set your sensitive keys in Render environment variables:
   - `PAGE_ACCESS_TOKEN`, `VERIFY_TOKEN`, `ADMINS`
   - `CHIPP_API_KEY`, `GOOGLE_API_KEY`, `GOOGLE_CX`, `NASA_API_KEY`, `WOLFRAM_APP_ID`, `WIKI_ACCESS_TOKEN`

## deployment
- build command: `npm install`
- start command: `node index.js`

## admin
- `stats`: check ram and uptime
- `uid`: get your id
- `ban <id>`: block a user
- `unban <id>`: unblock a user
- `broadcast <msg>`: send announcement to active users

made by sethdico.
