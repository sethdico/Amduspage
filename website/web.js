const path = require("path");
const gradient = require("gradient-string");
const chalk = require("chalk");

function html(res) { res.sendFile(path.join(__dirname, "index.html")); }

function verify(req, res) {
  const config = require("../config.json");
  if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === config.VERIFY_TOKEN) {
    res.status(200).send(req.query["hub.challenge"]);
  } else { res.sendStatus(403); }
}

function log() { console.log(gradient.fruit("BOT STARTED")); }
function getTheme() { return { gradient: gradient.fruit, color: chalk.red }; }

module.exports = { html, verify, log, getTheme };
