const express = require('express');
const cors = require('cors');
const { trashTalkAndTimeout, announceQueueEntry } = require('./bot');

const app = express();
const PORT = 3005;

app.use(cors());
app.use(express.json());

let challengeQueue = [];
let fightInProgress = false;
let latestFight = null;
let overlayMuted = false;

// Confirm server is running
app.listen(PORT, () => {
  console.log(`🔥 Bot server running at http://localhost:${PORT}`);
});

// Handle new brawl
app.post('/brawl', (req, res) => {
  const { username, target, paid } = req.body;
  const opponent = target || 'anyone brave enough';

  const existing = challengeQueue.find(c => c.username === username);
  if (existing) return res.sendStatus(200);

  announceQueueEntry(username, opponent);
  challengeQueue.push({ username, target: opponent, paid });
  tryStartFight();

  res.sendStatus(200);
});

// Endpoint for overlay polling
app.get('/latest-fight', (req, res) => {
  if (latestFight) {
    res.json({ ...latestFight, muted: overlayMuted });
    latestFight = null;
  } else {
    res.status(204).send();
  }
});

// Manual test
app.get('/debug-fight', (req, res) => {
  latestFight = {
    intro: "Test Brawler challenges The Champ!",
    winner: "Test Brawler",
    loser: "The Champ",
    muted: false
  };
  console.log("✅ Debug fight injected");
  res.send("✅ Debug fight injected");
});

// Toggle sound for overlay
app.post('/toggle-sound', (req, res) => {
  overlayMuted = !!req.body.mute;
  console.log(`🔇 Overlay muted: ${overlayMuted}`);
  res.sendStatus(200);
});

// Fight logic
async function tryStartFight() {
  if (fightInProgress || challengeQueue.length < 2) return;

  const fighterA = challengeQueue.shift();
  const matchIndex = challengeQueue.findIndex(f =>
    f.username === fighterA.target ||
    f.target === fighterA.username ||
    (fighterA.target === 'anyone brave enough' && f.target === 'anyone brave enough')
  );

  if (matchIndex === -1) {
    challengeQueue.unshift(fighterA);
    return;
  }

  const fighterB = challengeQueue.splice(matchIndex, 1)[0];
  fightInProgress = true;

  const intros = [
    `${fighterA.username} calls out ${fighterB.username} with flaming fists!`,
    `${fighterA.username} yells "YOU!" and runs at ${fighterB.username}!`,
    `${fighterA.username} charges ${fighterB.username} wearing glitter armor!`
  ];
  const intro = intros[Math.floor(Math.random() * intros.length)];

  let winner, loser;

  if (fighterA.paid && !fighterB.paid) {
    winner = fighterA.username;
    loser = fighterB.username;
  } else if (!fighterA.paid && fighterB.paid) {
    winner = fighterB.username;
    loser = fighterA.username;
  } else {
    winner = Math.random() > 0.5 ? fighterA.username : fighterB.username;
    loser = winner === fighterA.username ? fighterB.username : fighterA.username;
  }

  console.log(`🏆 Winner: ${winner}, Loser: ${loser}`);
  await trashTalkAndTimeout(winner, loser, intro, fighterA.paid, fighterB.paid);

  latestFight = { intro, winner, loser };
  fightInProgress = false;

  setTimeout(tryStartFight, 3000);
}
