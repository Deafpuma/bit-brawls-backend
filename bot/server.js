const express = require('express');
const cors = require('cors');
const { trashTalkAndTimeout, announceQueueEntry } = require('./bot.js');

const app = express();
const PORT = 3005;

app.use(cors());
app.use(express.json());

let challengeQueue = [];
let fightInProgress = false;
let latestFight = null;
let overlayMuted = false;

// 🔁 Receive fight challenges
app.post('/brawl', (req, res) => {
  const { username, target, paid } = req.body;
  const opponent = target || 'anyone brave enough';

  const existing = challengeQueue.find(c => c.username === username);
  if (existing) return res.status(409).send("Already in queue");

  announceQueueEntry(username, opponent, paid);
  challengeQueue.push({ username, target: opponent, paid });
  tryStartFight();

  res.sendStatus(200);
});

// ✅ Poll overlay for latest fight
app.get("/latest-fight", (req, res) => {
  if (latestFight) {
    res.json({ ...latestFight, muted: overlayMuted });
    latestFight = null;
  } else {
    res.status(204).send();
  }
});

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

app.post("/toggle-sound", (req, res) => {
  overlayMuted = !!req.body.mute;
  console.log(`🔇 Overlay muted: ${overlayMuted}`);
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`🔥 Bot server running at http://localhost:${PORT}`);
});

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
    `${fighterA.username} challenges ${fighterB.username} with one shoe missing but he's ready to go!`,
    `${fighterA.username} steps in yelling \"HOLD MY JUICE!\" at ${fighterB.username}!`,
    `${fighterA.username} walks in with glitter boots to face ${fighterB.username}!`
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
