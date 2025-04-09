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

client.on('message', (channel, tags, message, self) => {
  if (self) return;

  const username = tags['display-name'];
  const msg = message.trim().toLowerCase();

  if (msg.startsWith('!brawl')) {
    const args = message.split(" ");
    const target = args[1] || null;

    fetch('http://localhost:3005/brawl', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, target, paid: true })
    }).then(res => {
      if (res.status === 409) {
        client.say(channel, `⚠️ ${username} is already in the queue.`);
      } else {
        client.say(channel, `🧨 ${username} enters the fight (wagering Bits!)`);
      }
    }).catch(() => {
      client.say(channel, `❌ Error adding ${username} to the fight queue.`);
    });
  }
});

// 🔥 Called by server.js
async function trashTalkAndTimeout(winner, loser, introLine, paidA, paidB) {
  const channel = 'Deafpuma';
  const sleep = ms => new Promise(res => setTimeout(res, ms));

  await sleep(500);
  await client.say(channel, `🥊 ${introLine}`);

  await sleep(1000);
  if (paidA && !paidB) {
    await client.say(channel, `💰 ${loser} didn't match Bits — ${winner} auto-wins!`);
  } else if (!paidA && paidB) {
    await client.say(channel, `💰 ${loser} didn't match Bits — ${winner} auto-wins!`);
  } else {
    await client.say(channel, `🎲 Both wagered — it's a 50/50!`);
  }

  await sleep(1000);
  await client.say(channel, `🏆 ${winner} WINS! 💀 ${loser} has been KO'd!`);

  const messages = [
    `💥 ${loser} got folded like a lawn chair by ${winner}!`,
    `🔥 ${loser} is the human equivalent of a participation trophy. Good try I guess.`,
    `⚰️ RIP ${loser} — ${winner} said "sit down."`,
    `💣 ${winner} KO’d ${loser} with a flying elbow!`,
    `🥶 ${loser} melted mid-fight. ${winner} wins by default.`
  ];

  await sleep(1000);
  await client.say(channel, messages[Math.floor(Math.random() * messages.length)]);

  if (paidA && paidB) {
    await sleep(800);
    await client.say(channel, `/timeout ${loser} 60`);
  }
}

function announceQueueEntry(username, opponent, paid) {
  const channel = 'Deafpuma';
  if (paid) {
    client.say(channel, `🧨 ${username} enters the fight (wagering Bits!)`);
  } else {
    client.say(channel, `📝 ${username} has entered the fight queue (vs ${opponent})`);
  }
}

module.exports = {
  trashTalkAndTimeout,
  announceQueueEntry
};
