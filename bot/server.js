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

let client = null;

function loadAuthorizedChannels() {
  return fs.existsSync('authorized_channels.txt')
    ? fs.readFileSync('authorized_channels.txt', 'utf-8').split('\n').filter(Boolean)
    : ['Deafpuma'];
}

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
}

// 🌐 Home page with "Authorize" button
app.get('/', (req, res) => {
  res.send(`
    <h1>🧠 Bit Brawls Bot</h1>
    <p>Click below to authorize the bot in your channel:</p>
    <a href="https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=https://bit-brawls-backend.onrender.com/callback&response_type=code&scope=moderation:read+moderator:manage:banned_users+chat:read+chat:edit" style="font-size:20px;background:#6441a5;color:#fff;padding:10px 16px;border-radius:5px;text-decoration:none;">Authorize Bot</a>
  `);
});

// 🔐 Callback route Twitch hits after authorization
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
  if (!tokenData.access_token) {
    return res.status(401).send('❌ Failed to authorize with Twitch');
  }

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

  // Auto-refresh connection
  connectBot();

  res.send(`✅ Bot is now authorized to join <strong>${user.display_name}</strong>'s channel! You can close this tab.`);
});

// 🔄 Optional manual refresh endpoint
app.get('/refresh', async (req, res) => {
  const channels = loadAuthorizedChannels();
  const joined = client.getChannels().map(c => c.replace('#', ''));
  const toJoin = channels.filter(c => !joined.includes(c));
  for (const chan of toJoin) {
    await client.join(chan);
  }
  res.send(`✅ Refreshed and joined new channels: ${toJoin.join(', ') || 'None'}`);
});

// 🚀 Start server and bot
app.listen(PORT, () => {
  console.log(`🌐 OAuth server running at http://localhost:${PORT}`);
  connectBot();
});
