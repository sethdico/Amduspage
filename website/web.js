const express = require("express");
const path = require("path");
const gradient = require("gradient-string");
const chalk = require("chalk");

const app = express();

// === ASCII MAPPINGS (for terminal banner) ===
const asciiMappings = {
  a: { upper: " ▄▄▄  ", lower: "█   █ " },
  b: { upper: "█▀▀█  ", lower: "█▄▄█▄ " },
  c: { upper: " ▄▄▄  ", lower: "█     " },
  d: { upper: "█▀▀█  ", lower: "█  ▀█ " },
  e: { upper: "█████ ", lower: "█     " },
  f: { upper: "█████ ", lower: "█     " },
  g: { upper: " ▄▄▄  ", lower: "█ █▄█ " },
  h: { upper: "█   █ ", lower: "█████ " },
  i: { upper: "█ ", lower: "█ " },
  j: { upper: "  █ ", lower: "█▀▀█ " },
  k: { upper: "█  █ ", lower: "█▄█  " },
  l: { upper: "█    ", lower: "█    " },
  m: { upper: "█▀ ▀█", lower: "█   █" },
  n: { upper: "█   █", lower: "█   █" },
  o: { upper: " ▄▄▄ ", lower: "█   █" },
  p: { upper: "████ ", lower: "█    " },
  q: { upper: " ▄▄▄ ", lower: "█ ▄ █" },
  r: { upper: "████ ", lower: "█ █  " },
  s: { upper: " ▄▄▄▄", lower: "█    " },
  t: { upper: "█████", lower: "  █  " },
  u: { upper: "█   █", lower: "█▄▄▄█" },
  v: { upper: "█   █", lower: " █ █ " },
  w: { upper: "█   █", lower: "█ █ █" },
  x: { upper: "█   █", lower: " █ █ " },
  y: { upper: "█   █", lower: " █▀▀ " },
  z: { upper: "█████", lower: "    █" },
  " ": { upper: "      ", lower: "      " }
};

function generateAsciiArt(text) {
  const title = (text || "PAGEBOT").toLowerCase();
  let line1 = "", line2 = "";
  for (const char of title) {
    const map = asciiMappings[char] || { upper: "      ", lower: "      " };
    line1 += map.upper;
    line2 += map.lower;
  }
  return `\n${line1}\n${line2}\n`;
}

// === WEB SERVER ===
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

function startWeb(port) {
  app.listen(port, () => {
    const banner = generateAsciiArt("Amdusbot");
    const grad = gradient("cyan", "magenta");
    console.log(grad(banner));
    console.log(chalk.green(`🌐 Web server running on http://localhost:${port}`));
  });
}

module.exports = { app, startWeb };
