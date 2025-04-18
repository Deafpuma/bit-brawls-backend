const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');
const tmi = require('tmi.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const CHAT_OAUTH = process.env.CHAT_OAUTH;
const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const API_BEARER = process.env.API_BEARER;
const MODERATOR_ID = process.env.MODERATOR_ID;

let client = null;

// === Load channels from file ===
function loadAuthorizedChannels() {
  return fs.existsSync('authorized_channels.txt')
    ? fs.readFileSync('authorized_channels.txt', 'utf-8').split('\n').filter(Boolean)
    : ['Deafpuma']; // fallback for dev
}

// === Connect Bot to Twitch ===
function connectBot() {
  const CHANNELS = loadAuthorizedChannels();
  if (client) client.disconnect();

  client = new tmi.Client({
    identity: {
      username: 'brawl_bit_bot',
      password: CHAT_OAUTH
    },
    channels: CHANNELS
  });

  client.connect().then(() => {
    console.log(`✅ Bot connected to channels: ${CHANNELS.join(', ')}`);
  }).catch(console.error);

  // === Bot logic
  let challengeQueue = [];
  let pendingChallenges = {};
  let userBitWagers = {};
  let userLoginMap = {};
  let userBroadcasterIdMap = {};
  let fightInProgress = false;
  const MAX_TIMEOUT_SECONDS = 60;

  client.on('message', async (channel, tags, message, self) => {
    if (self) return;

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

    if (lowerMsg === '!ping') {
      return client.say(channel, `🏓 Pong! Hello ${username}`);
    }

    if (lowerMsg === '!mybet') {
      const bet = userBitWagers[username] || 0;
      return client.say(channel, `💰 ${username}, your wager is ${bet} Bits.`);
    }

    if (lowerMsg === '!bbcancel') {
      challengeQueue = challengeQueue.filter(u => u.username !== username);
      for (const [target, challenger] of Object.entries(pendingChallenges)) {
        if (target === username.toLowerCase() || challenger.username === username) {
          delete pendingChallenges[target];
        }
      }
      delete userBitWagers[username];
      return client.say(channel, `🚪 ${username} left the brawl queue.`);
    }

    if (lowerMsg.startsWith('!bbaccept')) {
      const parts = msg.split(' ');
      const target = parts[1]?.toLowerCase();
      const wager = parseInt(parts[2]);

      if (!target || isNaN(wager)) {
        return client.say(channel, `⚠️ Usage: !bbaccept <username> <bits>`);
      }

      userBitWagers[username] = Math.max(wager, 5);
      const challenger = pendingChallenges[username.toLowerCase()];
      if (challenger?.username.toLowerCase() === target) {
        if (userBitWagers[username] !== userBitWagers[challenger.username]) {
          return client.say(channel, `⚠️ Bit amounts must match.`);
        }

        delete pendingChallenges[username.toLowerCase()];
        challengeQueue = challengeQueue.filter(c => c.username !== challenger.username);
        const opponent = { username, target: null, paid: true };
        client.say(channel, `⚔️ ${username} accepted ${challenger.username}'s challenge for ${wager} Bits!`);
        return runFight(challenger, opponent, channelLogin);
      }

      return client.say(channel, `⚠️ No challenge found from ${target}.`);
    }

    if (lowerMsg.startsWith('!bitbrawl')) {
      const args = msg.split(' ');
      let target = null, bitWager = 0, isBlind = false;

      for (const arg of args.slice(1)) {
        if (!isNaN(parseInt(arg))) bitWager = parseInt(arg);
        else if (arg.toLowerCase() === 'blind') isBlind = true;
        else if (arg.startsWith('@')) target = arg.slice(1).toLowerCase();
        else if (arg !== 'accept') target = arg.toLowerCase();
      }

      if (bitWager < 5) bitWager = 5;
      userBitWagers[username] = bitWager;

      if (challengeQueue.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        return client.say(channel, `⚠️ ${username}, you're already in the fight queue.`);
      }

      const challenger = { username, target: isBlind ? null : target, paid: true };

      if (!isBlind && target && target !== username.toLowerCase()) {
        pendingChallenges[target] = challenger;
        setTimeout(() => {
          if (pendingChallenges[target] === challenger) {
            delete pendingChallenges[target];
            client.say(channel, `⌛ ${target} didn’t respond. Challenge expired.`);
          }
        }, 60000);
        return client.say(channel, `🧨 ${username} challenges ${target}! Use !bbaccept ${username} <bits> to respond.`);
      }

      challengeQueue.push(challenger);
      const intro = `${username} enters the ring with ${bitWager} Bits!`;
      client.say(channel, intro);
      tryStartFight(channelLogin);
    }

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

      await client.say(channel, `🥊 ${getIntro(fighterA, fighterB)}`);
      await sleep(1500);

      const wagerA = userBitWagers[fighterA.username] || 0;
      const wagerB = userBitWagers[fighterB.username] || 0;

      await client.say(channel, `🎲 ${fighterA.username} wagered ${wagerA} Bits vs ${fighterB.username} wagered ${wagerB} Bits!`);
      await sleep(1500);

      const winner = wagerA >= wagerB ? fighterA.username : fighterB.username;
      const loser = winner === fighterA.username ? fighterB.username : fighterA.username;

      await client.say(channel, `🏆 ${winner} WINS! 💀 ${loser} KO'd! ${getRoast(winner, loser)}`);
      await sleep(1500);

      const loserData = userLoginMap[loser];
      if (loserData?.userId && wagerA > 0 && wagerB > 0) {
        const timeoutDuration = Math.max(30, Math.min(Math.max(wagerA, wagerB), MAX_TIMEOUT_SECONDS));
        await timeoutViaAPI(channelLogin, loserData.userId, timeoutDuration);
      }

      delete userBitWagers[fighterA.username];
      delete userBitWagers[fighterB.username];
      fightInProgress = false;
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

        const txt = await res.text();
        if (!res.ok) {
          console.warn("⚠️ Timeout failed:", res.status, txt);
          return false;
        }

        console.log(`✅ Timed out ${userId} for ${duration}s with reason: ${reason}`);
        return true;
      } catch (err) {
        console.warn("❌ Timeout API error:", err.message);
        return false;
      }
    }

    function getIntro(a, b) {
      const intros = [
        `${a.username} calls ${b.username} out during lunch break!`,
        `${a.username} slapped ${b.username} with a glitter stick!`,
        `${a.username} rolled in yelling "YOU RANG?"`,
      ];
      return intros[Math.floor(Math.random() * intros.length)];
    }

    function getRoast(winner, loser) {
      const roasts = [
        `💥 ${loser} got folded like a lawn chair by ${winner}!`,
        `🧼 ${winner} washed ${loser} and hung them to dry.`,
        `⚰️ RIP ${loser}. That was nasty.`,
      ];
      return roasts[Math.floor(Math.random() * roasts.length)];
    }

    function getRandomKOReason() {
      const reasons = [
        "KO’d in Bit Brawls 🥊",
        "Slapped into the shadow realm 🌪️",
        "Folded like a cheap lawn chair 💺"
      ];
      return reasons[Math.floor(Math.random() * reasons.length)];
    }
  });
}

// === Home Page ===
app.get('/', (req, res) => {
  res.send(`
    <h1>🧠 Bit Brawls Bot</h1>
    <p>Click below to authorize the bot in your channel:</p>
    <a href="https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=https://bit-brawls-backend.onrender.com/callback&response_type=code&scope=moderation:read+moderator:manage:banned_users+chat:read+chat:edit" style="font-size:20px;background:#6441a5;color:#fff;padding:10px 16px;border-radius:5px;text-decoration:none;">Authorize Bot</a>
  `);
});

// === OAuth Callback ===
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing ?code');

  const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: 'https://bit-brawls-backend.onrender.com/callback'
    })
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) return res.status(401).send('❌ Failed to authorize with Twitch');

  const userInfo = await fetch('https://api.twitch.tv/helix/users', {
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Client-ID': CLIENT_ID
    }
  });

  const user = (await userInfo.json()).data[0];
  if (!user) return res.status(400).send('❌ Unable to fetch Twitch user info');

  const existing = loadAuthorizedChannels();
  if (!existing.includes(user.login)) {
    fs.appendFileSync('authorized_channels.txt', `${user.login}\n`);
    console.log(`✅ Authorized and added: ${user.login}`);
  }

  connectBot(); // refresh join
  res.send(`✅ Bot is now authorized to join <strong>${user.display_name}</strong>'s channel!`);
});

// === Manual Refresh Endpoint ===
app.get('/refresh', async (req, res) => {
  const channels = loadAuthorizedChannels();
  const joined = client.getChannels().map(c => c.replace('#', ''));
  const toJoin = channels.filter(c => !joined.includes(c));
  for (const chan of toJoin) {
    await client.join(chan);
  }
  res.send(`✅ Refreshed and joined new channels: ${toJoin.join(', ') || 'None'}`);
});

// === Start Server + Bot ===
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 OAuth server running at http://0.0.0.0:${PORT}`);
  connectBot();
});
