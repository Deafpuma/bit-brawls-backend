const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const tmi = require('tmi.js');
const fs = require('fs');
require('dotenv').config();

const CHAT_OAUTH = process.env.CHAT_OAUTH;
const API_BEARER = process.env.API_BEARER;
const CLIENT_ID = process.env.CLIENT_ID;
const MODERATOR_ID = process.env.MODERATOR_ID;

const CHANNELS = fs.existsSync('authorized_channels.txt')
  ? fs.readFileSync('authorized_channels.txt', 'utf-8').split('\n').filter(Boolean)
  : ['Deafpuma'];

const client = new tmi.Client({
  identity: {
    username: 'brawl_bit_bot',
    password: CHAT_OAUTH
  },
  channels: CHANNELS
});

// Bot state
let challengeQueue = [];
let pendingChallenges = {};
let userBitWagers = {};
let userLoginMap = {};
let userBroadcasterIdMap = {};
let fightInProgress = false;
let messageQueue = [];
let sendingMessages = false;
const MAX_TIMEOUT_SECONDS = 60;

// Queue messages
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

function getRoast(winner, loser) {
  const roasts = [
    `💥 ${loser} got folded like a lawn chair by ${winner}!`,
    `⚰️ RIP ${loser} — ${winner} said "sit down."`,
    `🧼 ${winner} washed ${loser} and hung them up to dry.`
  ];
  return roasts[Math.floor(Math.random() * roasts.length)];
}

function getRandomKOReason() {
  const reasons = [
    "KO’d in Bit Brawls 🥊",
    "Slapped into the shadow realm 🌪️",
    "Bit-slammed into next week 💢"
  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
}

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

async function startBot() {
  await client.connect();
  console.log(`✅ Bot connected to Twitch chat in: ${CHANNELS.join(', ')}`);

  client.on('message', async (channel, tags, message, self) => {
    if (self) return;
    const msg = message.trim();
    const username = tags['display-name'];
    const userId = tags['user-id'];
    const channelLogin = channel.replace('#', '').toLowerCase();

    userLoginMap[username] = { userId };
    userBroadcasterIdMap[channelLogin] = tags['room-id'];

    if (msg === '!ping') {
      return client.say(channel, `🏓 Pong! Hello ${username}`);
    }

    if (msg === '!bitbrawl') {
      userBitWagers[username] = 50;
      challengeQueue.push({ username });
      enqueueMessage(channel, `${username} enters the ring with 50 Bits!`);
      tryStartFight(channelLogin);
    }
  });
}

function tryStartFight(channelLogin) {
  if (fightInProgress || challengeQueue.length < 2) return;
  const a = challengeQueue.shift();
  const b = challengeQueue.shift();
  runFight(a, b, channelLogin);
}

async function runFight(a, b, channelLogin) {
  fightInProgress = true;
  const channel = `#${channelLogin}`;
  await client.say(channel, `🥊 ${a.username} smacks ${b.username} with a glitter stick!`);
  await client.say(channel, `🎲 ${a.username} wagered 50 Bits vs ${b.username} wagered 50 Bits!`);

  const winner = Math.random() > 0.5 ? a.username : b.username;
  const loser = winner === a.username ? b.username : a.username;
  const roast = getRoast(winner, loser);

  await client.say(channel, `🏆 ${winner} WINS! 💀 ${loser} KO'd! ${roast}`);

  const loserData = userLoginMap[loser];
  if (loserData?.userId) {
    const success = await timeoutViaAPI(channelLogin, loserData.userId, 60);
    if (!success) client.say(channel, `⚠️ Could not timeout ${loser}.`);
  }

  fightInProgress = false;
}

module.exports = { startBot };
