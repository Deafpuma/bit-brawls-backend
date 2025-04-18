const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const tmi = require('tmi.js');
const fs = require('fs');
require('dotenv').config();

const CHAT_OAUTH = process.env.CHAT_OAUTH;
const API_BEARER = process.env.API_BEARER;
const CLIENT_ID = process.env.CLIENT_ID;
const MODERATOR_ID = process.env.MODERATOR_ID;

// Load all authorized Twitch channels
const CHANNELS = fs.existsSync('authorized_channels.txt')
  ? fs.readFileSync('authorized_channels.txt', 'utf-8').split('\n').filter(Boolean)
  : ['Deafpuma']; // Fallback for manual test

const client = new tmi.Client({
  identity: {
    username: 'brawl_bit_bot',
    password: CHAT_OAUTH
  },
  channels: CHANNELS
});

client.connect().then(() => {
  console.log(`✅ Bot connected to Twitch chat in: ${CHANNELS.join(', ')}`);
}).catch(console.error);

// === Bot State ===
let challengeQueue = [];
let pendingChallenges = {};
let userBitWagers = {};
let userLoginMap = {};
let userBroadcasterIdMap = {};
let fightInProgress = false;
let messageQueue = [];
let sendingMessages = false;
const MAX_TIMEOUT_SECONDS = 60;

// === Message Queue ===
function enqueueMessage(channel, msg) {
  messageQueue.push({ channel, msg });
  if (!sendingMessages) processMessageQueue();
}

async function processMessageQueue() {
  if (messageQueue.length === 0) return (sendingMessages = false);
  sendingMessages = true;
  const { channel, msg } = messageQueue.shift();
  await client.say(channel, msg);
  setTimeout(processMessageQueue, 1000);
}

// === Helper Functions ===
function getIntro(a, b) {
  const lines = [
    `${a.username} bursts in riding a shopping cart straight at ${b.username}!`,
    `${a.username} jumped in yelling “YOU RANG?” while ${b.username} was distracted.`,
    `${a.username} slapped ${b.username} with a rubber chicken. It’s on!`,
    `${a.username} called ${b.username} out during lunch break.`,
    `${a.username} moonwalked in while ${b.username} blinked.`
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

function getRoast(winner, loser) {
  const roasts = [
    `💥 ${loser} got folded like a lawn chair by ${winner}!`,
    `⚰️ RIP ${loser} — ${winner} said "sit down."`,
    `🐸 ${loser} caught hands AND feelings.`,
    `🧼 ${winner} washed ${loser} and hung them up to dry.`,
    `🪵 ${loser} just got clapped like a campfire log.`
  ];
  return roasts[Math.floor(Math.random() * roasts.length)];
}

function getBlindMessage(user) {
  const messages = [
    `👻 ${user} haunts the queue with an unknown stake.`,
    `🎩 ${user} tossed a coin and whispered, "Let's see what happens..."`,
    `🧤 ${user} slipped into the queue like a ghost with gloves.`
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

function getRandomKOReason() {
  const reasons = [
    "KO’d in Bit Brawls 🥊",
    "Slapped into the shadow realm 🌪️",
    "Folded like a cheap lawn chair 💺",
    "Silenced by a cartoon punch 🔇",
    "Bit-slammed into next week 💢"
  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
}

// === Timeout ===
async function timeoutViaAPI(channelLogin, userId, duration) {
  const broadcasterId = userBroadcasterIdMap[channelLogin];
  if (!broadcasterId || !userId) return false;
  const reason = getRandomKOReason();

  try {
    const res = await fetch('https://api.twitch.tv/helix/moderation/bans', {
      method: 'POST',
      headers: {
        'Client-ID': CLIENT_ID,
        'Authorization': `Bearer ${API_BEARER}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        broadcaster_id: broadcasterId,
        moderator_id: MODERATOR_ID,
        data: {
          user_id: userId,
          duration,
          reason
        }
      })
    });

    const text = await res.text();
    if (!res.ok) {
      console.warn("⚠️ Timeout failed:", res.status, text);
      return false;
    }

    console.log(`✅ Timed out ${userId} for ${duration}s: ${reason}`);
    return true;
  } catch (err) {
    console.warn("❌ Timeout API error:", err.message);
    return false;
  }
}

// === Fight ===
function tryStartFight(channelLogin) {
  if (fightInProgress || challengeQueue.length < 2) return;
  const a = challengeQueue.shift();
  const bIndex = challengeQueue.findIndex(f =>
    (!f.target && !a.target) ||
    f.target === a.username.toLowerCase() ||
    a.target === f.username.toLowerCase()
  );
  if (bIndex === -1) return challengeQueue.unshift(a);
  const b = challengeQueue.splice(bIndex, 1)[0];
  runFight(a, b, channelLogin);
}

async function runFight(fighterA, fighterB, channelLogin) {
  fightInProgress = true;
  const channel = `#${channelLogin}`;
  const sleep = ms => new Promise(res => setTimeout(res, ms));

  const intro = getIntro(fighterA, fighterB);
  await client.say(channel, `🥊 ${intro}`);
  await sleep(2000);

  const wagerA = userBitWagers[fighterA.username] || 0;
  const wagerB = userBitWagers[fighterB.username] || 0;

  await client.say(channel, `🎲 ${fighterA.username} wagered ${wagerA} Bits vs ${fighterB.username} wagered ${wagerB} Bits! It's on!`);
  await sleep(2000);

  const winner = wagerA >= wagerB ? fighterA.username : fighterB.username;
  const loser = winner === fighterA.username ? fighterB.username : fighterA.username;

  const roast = getRoast(winner, loser);
  await client.say(channel, `🏆 ${winner} WINS! 💀 ${loser} KO'd! ${roast}`);
  await sleep(2000);

  const loserData = userLoginMap[loser];
  if (loserData?.userId && wagerA > 0 && wagerB > 0) {
    const duration = Math.max(30, Math.min(Math.max(wagerA, wagerB), MAX_TIMEOUT_SECONDS));
    const success = await timeoutViaAPI(channelLogin, loserData.userId, duration);
    if (!success) enqueueMessage(channel, `⚠️ Could not timeout ${loser}.`);
  }

  delete userBitWagers[fighterA.username];
  delete userBitWagers[fighterB.username];
  fightInProgress = false;
}

// === Commands ===
client.on('message', async (channel, tags, message, self) => {
  if (self) return;
  console.log(`[📩 Chat] ${tags['display-name']}: ${message}`);

  const msg = message.trim();
  const username = tags['display-name'];
  const login = tags.username;
  const userId = tags['user-id'];
  const channelLogin = channel.replace('#', '').toLowerCase();
  const lowerMsg = msg.toLowerCase();

  userLoginMap[username] = {
    login,
    userId,
    isMod: tags.mod || tags.badges?.moderator === '1',
    isBroadcaster: tags.badges?.broadcaster === '1'
  };
  userBroadcasterIdMap[channelLogin] = tags['room-id'];

  if (lowerMsg === '!mybet') {
    const bet = userBitWagers[username] || 0;
    return enqueueMessage(channel, `💰 ${username}, your wager is ${bet} Bits.`);
  }

  if (lowerMsg === '!bbcancel') {
    challengeQueue = challengeQueue.filter(u => u.username !== username);
    for (const [target, challenger] of Object.entries(pendingChallenges)) {
      if (target === username.toLowerCase() || challenger.username === username) {
        delete pendingChallenges[target];
      }
    }
    delete userBitWagers[username];
    return enqueueMessage(channel, `🚪 ${username} left the brawl queue.`);
  }

  if (lowerMsg.startsWith('!bbaccept')) {
    const parts = msg.split(' ');
    const target = parts[1]?.toLowerCase();
    const wager = parseInt(parts[2]);

    if (!target || isNaN(wager)) {
      return enqueueMessage(channel, `⚠️ Usage: !bbaccept <username> <bits>`);
    }

    userBitWagers[username] = Math.max(wager, 5);
    const challenger = pendingChallenges[username.toLowerCase()];
    if (challenger?.username.toLowerCase() === target) {
      if (userBitWagers[username] !== userBitWagers[challenger.username]) {
        return enqueueMessage(channel, `⚠️ Bit amounts must match.`);
      }

      delete pendingChallenges[username.toLowerCase()];
      challengeQueue = challengeQueue.filter(c => c.username !== challenger.username);
      const opponent = { username, target: null, paid: true };
      enqueueMessage(channel, `⚔️ ${username} accepted ${challenger.username}'s challenge for ${wager} Bits!`);
      return runFight(challenger, opponent, channelLogin);
    }

    return enqueueMessage(channel, `⚠️ No challenge found from ${target}.`);
  }

  if (lowerMsg.startsWith('!bitbrawl')) {
    const args = msg.split(' ');
    let target = null;
    let bitWager = 0;
    let isBlind = false;

    for (const arg of args.slice(1)) {
      if (!isNaN(parseInt(arg))) bitWager = parseInt(arg);
      else if (arg.toLowerCase() === 'blind') isBlind = true;
      else if (arg.startsWith('@')) target = arg.slice(1).toLowerCase();
      else if (arg !== 'accept') target = arg.toLowerCase();
    }

    if (bitWager < 5) bitWager = 5;
    userBitWagers[username] = bitWager;

    if (challengeQueue.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return enqueueMessage(channel, `⚠️ ${username}, you're already in the fight queue.`);
    }

    const challenger = { username, target: isBlind ? null : target, paid: true };

    if (!isBlind && target && target !== username.toLowerCase()) {
      pendingChallenges[target] = challenger;
      setTimeout(() => {
        if (pendingChallenges[target] === challenger) {
          delete pendingChallenges[target];
          enqueueMessage(channel, `⌛ ${target} didn’t respond. Challenge expired.`);
        }
      }, 60000);
      return enqueueMessage(channel, `🧨 ${username} challenges ${target}! Use !bbaccept ${username} <bits> to respond.`);
    }

    challengeQueue.push(challenger);
    const msgTemplate = isBlind
      ? getBlindMessage(username)
      : queueMessages[Math.floor(Math.random() * queueMessages.length)]
          .replace('{user}', username)
          .replace('{bits}', bitWager.toString());

    enqueueMessage(channel, msgTemplate);
    tryStartFight(channelLogin);
  }
});

module.exports = { client };
