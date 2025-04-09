const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3005;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let latestFight = null;
let overlayMuted = false;

app.get("/latest-fight", (req, res) => {
  if (latestFight) {
    res.json({ ...latestFight, muted: overlayMuted });
    latestFight = null;
  } else {
    res.status(204).send();
  }
});

app.post("/set-fight", (req, res) => {
  latestFight = req.body;
  res.sendStatus(200);
});

app.post("/toggle-sound", (req, res) => {
  overlayMuted = !!req.body.mute;
  console.log(`🔇 Overlay muted: ${overlayMuted}`);
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`🔥 Overlay server running at http://localhost:${PORT}`);
});
