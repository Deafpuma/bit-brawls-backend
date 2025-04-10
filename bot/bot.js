const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const tmi = require('tmi.js');

const client = new tmi.Client({
  identity: {
    username: 'brawl_bit_bot',
    password: 'oauth:ys0kiu70r01p9ixjedjjwxo3135t7d'
  },
  channels: ['Deafpuma']
});

client.connect().then(() => {
  console.log("✅ Bot connected to Twitch chat");
}).catch(console.error);

let challengeQueue = [];
let pendingChallenges = {};

client.on('message', async (channel, tags, message, self) => {
  if (self) return;
  const username = tags['display-name'];
  const msg = message.trim().toLowerCase();

  if (msg.startsWith('!brawl')) {
    const parts = msg.split(' ');
    const target = parts[1]?.replace('@', '').toLowerCase();

    if (challengeQueue.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      return client.say(channel, `⚠️ ${username} is already in the fight queue.`);
    }

    const challenger = { username, target: target || null, paid: true };
    challengeQueue.push(challenger);

    if (target && target !== username.toLowerCase()) {
      pendingChallenges[target] = challenger;
      return client.say(channel, `🧨 ${username} challenges ${target}! Waiting for ${target} to type !accept...`);
    } else {
      client.say(channel, `📝 ${username} has entered the fight queue!`);
      if (challengeQueue.length >= 2) tryStartFight();
    }
  }

  if (msg === '!accept') {
    const accepter = username.toLowerCase();
    const challenger = pendingChallenges[accepter];
    if (challenger) {
      delete pendingChallenges[accepter];
      challengeQueue = challengeQueue.filter(c => c.username !== challenger.username);
      client.say(channel, `⚔️ ${username} accepted the challenge from ${challenger.username}!`);
      runFight(challenger, { username, target: null, paid: true });
    }
  }
});

function tryStartFight() {
  if (challengeQueue.length >= 2) {
    const [a, b] = challengeQueue.splice(0, 2);
    runFight(a, b);
  }
}

async function runFight(fighterA, fighterB) {
  const channel = 'Deafpuma';
  const sleep = ms => new Promise(res => setTimeout(res, ms));

  const intros = [
    `{fighterA} challenges {fighterB} with one shoe missing but he's ready to go!`,
    `{fighterA} backflips in with sunglasses yelling “IT’S TIME TO DUEL!”`,
    `{fighterA} smacks {fighterB} with a fish and screams “IT'S GO TIME!”`,
    `{fighterA} walks in with glitter boots to face {fighterB}!`,
    `{fighterA} screamed “BABA BOOEY!” and charged {fighterB}.`,
    `{fighterA} just unplugged the router to gain an advantage over {fighterB}.`,
    `{fighterA} jumps out yelling “BRAWL ME, NERD!” at {fighterB}!`,
    `{fighterA} crashes through the ceiling screaming “{fighterB}, FIGHT ME!”`,
    `{fighterA} rides a Segway into the arena to battle {fighterB}.`,
    `{fighterA} summoned a squirrel army. {fighterB} is already regretting this.`,
    `{fighterA} flaps into the ring like a bird at {fighterB}.`
  ];

  const roasts = [
    `💥 {loser} got folded like a lawn chair by {winner}!`,
    `💤 {winner} put {loser} to sleep with one tap.`,
    `🎤 {winner} dropped the mic... on {loser}’s shoulder and said “that hurt, huh?”`,
    `📉 {loser}’s skill level just got delisted.`,
    `🐸 {loser} caught hands AND feelings.`,
    `🎯 {winner} hit a crit. {loser} logged out mid-fight.`,
    `📚 {loser} became an example in the rulebook.`,
    `🔕 {loser} got silenced like a bad ringtone.`,
    `🎈 {loser} popped like a balloon. Sad noise.`,
    `🎅 {loser} made Santa’s naughty list just from this L.`
  ];

  const introRaw = intros[Math.floor(Math.random() * intros.length)];
  const intro = introRaw.replace('{fighterA}', fighterA.username).replace('{fighterB}', fighterB.username);

  await client.say(channel, `🥊 ${intro}`);
  await sleep(1000);

  if (fighterA.paid && !fighterB.paid) {
    await client.say(channel, `💰 ${fighterB.username} didn't match Bits — ${fighterA.username} auto-wins!`);
    return;
  } else if (!fighterA.paid && fighterB.paid) {
    await client.say(channel, `💰 ${fighterA.username} didn't match Bits — ${fighterB.username} auto-wins!`);
    return;
  } else {
    await client.say(channel, `🎲 Both wagered — it's a 50/50!`);
  }

  const winner = Math.random() > 0.5 ? fighterA.username : fighterB.username;
  const loser = winner === fighterA.username ? fighterB.username : fighterA.username;

  await sleep(1000);
  await client.say(channel, `🏆 ${winner} WINS! 💀 ${loser} has been KO'd!`);
  await sleep(800);

  const roast = roasts[Math.floor(Math.random() * roasts.length)]
    .replace('{winner}', winner)
    .replace('{loser}', loser);
  await client.say(channel, roast);

  // Optional: send to overlay if server is running
  await fetch('http://localhost:3005/set-fight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ intro, winner, loser })
  }).catch(err => console.warn("Overlay not responding:", err.message));
}
