const express = require('express');
const cors = require('cors');
const path = require('path');
const { trashTalkAndTimeout } = require('./bot.js');

const app = express();
const PORT = 3005;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let challengeQueue = [];
let fightInProgress = false;
let latestFight = null;
let overlayMuted = false;

app.post('/brawl', (req, res) => {
  const { username, target, paid, bits } = req.body;
  const opponent = target || 'anyone brave enough';

  const existing = challengeQueue.find(c => c.username === username);
  if (existing) return res.status(409).send("Already in queue");

  challengeQueue.push({ username, target: opponent, paid, bits: bits || 0 });
  tryStartFight();

  res.sendStatus(200);
});

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
    `${fighterA.username} walks in with glitter boots to face ${fighterB.username}!`,
    `${fighterA.username} bursts in riding a shopping cart straight at ${fighterB.username}!`,
    `${fighterA.username} showed up wearing Crocs and confidence. ${fighterB.username} is doomed.`,
    `${fighterA.username} smacks ${fighterB.username} with a fish and screams “IT'S GO TIME!”`,
    `${fighterA.username} rolled in yelling “I HAVE THE HIGH GROUND!” at ${fighterB.username}.`,
    `${fighterA.username} challenges ${fighterB.username} using only interpretive dance.`,
    `${fighterA.username} jumps out of a bush yelling “BRAWL ME, NERD!” at ${fighterB.username}.`,
    `${fighterA.username} slides in on a banana peel directly into ${fighterB.username}'s face.`,
    `${fighterA.username} came to fight. ${fighterB.username} just came for snacks.`,
    `${fighterA.username} brought a kazoo... and chaos. ${fighterB.username} is nervous.`,
    `${fighterA.username} starts screaming like a goat at ${fighterB.username}. This is war.`,
    `${fighterA.username} just slapped ${fighterB.username} with a wet sock. It’s on.`,
    `${fighterA.username} jumped in like “You rang?” while ${fighterB.username} choked on air.`,
    `${fighterA.username} is powered by caffeine and petty today. ${fighterB.username}, beware.`,
    `${fighterA.username} enters spinning a rubber chicken above their head toward ${fighterB.username}!`,
    `${fighterA.username} asked “You got games on your phone?” and punched ${fighterB.username} mid-sentence.`,
    `${fighterA.username} spawned from the void screaming “BRAWL!” and points at ${fighterB.username}.`,
    `${fighterA.username} cartwheels in yelling “I JUST ATE 3 HOTDOGS LET’S GO!”`,
    `${fighterA.username} smashes through the ceiling screaming “WHY AM I HERE?!” at ${fighterB.username}.`,
    `${fighterA.username} yeets themselves into the ring like it’s a Smash Bros tournament.`,
    `${fighterA.username} summoned a squirrel army they all attacked ${fighterB.username}`,
    `${fighterA.username} moonwalks into the ring and throws glitter in ${fighterB.username}’s eyes.`,
    `${fighterA.username} ran in with a pool noodle and war paint. ${fighterB.username} isn’t ready.`,
    `${fighterA.username} screamed “BABA BOOEY!” and charged ${fighterB.username}.`,
    `${fighterA.username} rips off their shirt to reveal another shirt. ${fighterB.username} is terrified.`,
    `${fighterA.username} points at ${fighterB.username} and says “This is personal… for no reason.”`,
    `${fighterA.username} walked in sipping juice like “I got time today.”`,
    `${fighterA.username} does a split, screams "FOR THE VINE!", and punches ${fighterB.username}.`,
    `${fighterA.username} enters in a bathrobe with a bat and bad intentions.`,
    `${fighterA.username} backflips in with sunglasses yelling “IT’S TIME TO DUEL!”`,
    `${fighterA.username} shows up riding a llama, staring down ${fighterB.username}!`,
    `${fighterA.username} challenges ${fighterB.username} with a juice box and no fear.`,
    `${fighterA.username} moonwalks into the ring to face ${fighterB.username}!`,
    `${fighterA.username} enters flapping like a bird at ${fighterB.username}.`,
    `${fighterA.username} throws down the glitter gauntlet at ${fighterB.username}.`,
    `${fighterA.username} teleports in shouting "I AM THE STORM!" at ${fighterB.username}.`,
    `${fighterA.username} came in wearing crocs and confidence to fight ${fighterB.username}.`,
    `${fighterA.username} launches into the ring via trampoline aimed at ${fighterB.username}.`,
    `${fighterA.username} slaps ${fighterB.username} with a rubber chicken. It's on.`,
    `${fighterA.username} appears from a cloud of smoke ready to slap ${fighterB.username}.`,
    `${fighterA.username} woke up today and chose violence. ${fighterB.username}, prepare.`,
    `${fighterA.username} dropped from the sky Fortnite-style onto ${fighterB.username}.`,
    `${fighterA.username} came in hot with energy drinks and vengeance for ${fighterB.username}.`,
    `${fighterA.username} rides a Segway into the arena to battle ${fighterB.username}.`,
    `${fighterA.username} does 3 cartwheels then stares down ${fighterB.username}.`,
    `${fighterA.username} crashes through the ceiling screaming "${fighterB.username}, FIGHT ME!"`,
    `${fighterA.username} called ${fighterB.username} out during their lunch break.`,
    `${fighterA.username} enters with one sock and all the rage.`,
    `${fighterA.username} is here, and ${fighterB.username} is about to be there.`,
    `${fighterA.username} just unplugged the router to gain an advantage over ${fighterB.username}.`


  ];

  
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

  latestFight = { intro, winner, loser };
  await trashTalkAndTimeout(winner, loser, intro, fighterA.paid, fighterB.paid);

  fightInProgress = false;
  setTimeout(tryStartFight, 3000);
}