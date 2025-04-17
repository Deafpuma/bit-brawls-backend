const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3005;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use('/panel', express.static(path.join(__dirname, 'public', 'panel')));


let latestFight = null;
let overlayMuted = false;

// ✅ Handle overlay polling
app.get("/latest-fight", (req, res) => {
  if (latestFight) {
    res.json({ ...latestFight, muted: overlayMuted });
    latestFight = null;
  } else {
    res.status(204).send();
  }
});

// ✅ Debug test
app.get("/debug-fight", (req, res) => {
  latestFight = {
    intro: "Punchbot challenges KOzilla in the Octagon!",
    winner: "Punchbot",
    loser: "KOzilla",
    muted: false
  };
  console.log("✅ Injected debug fight");
  res.send("✅ Test fight injected");
});

// ✅ Toggle overlay sound
app.post("/toggle-sound", (req, res) => {
  overlayMuted = !!req.body.mute;
  console.log(`🔇 Overlay muted: ${overlayMuted}`);
  res.sendStatus(200);
});

// ✅ Bot will POST here when fight finishes
app.post("/set-fight", (req, res) => {
  const { intro, winner, loser } = req.body;
  latestFight = { intro, winner, loser };
  console.log("✅ Received new fight result from bot");
  res.sendStatus(200);
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🔥 Overlay server running at http://localhost:${PORT}`);
});
