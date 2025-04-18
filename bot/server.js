const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');
require('dotenv').config();
const { startBot } = require('./bot/bot');

const app = express();
const PORT = process.env.PORT || 3000;

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

function loadAuthorizedChannels() {
  return fs.existsSync('authorized_channels.txt')
    ? fs.readFileSync('authorized_channels.txt', 'utf-8').split('\n').filter(Boolean)
    : ['Deafpuma'];
}

app.get('/', (req, res) => {
  res.send(`
    <h1>🧠 Bit Brawls Bot</h1>
    <a href="https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=https://bit-brawls-backend.onrender.com/callback&response_type=code&scope=moderation:read+moderator:manage:banned_users+chat:read+chat:edit">Authorize Bot</a>
  `);
});

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

  res.send(`✅ Bot added to <strong>${user.display_name}</strong>'s channel.`);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 OAuth server running at http://0.0.0.0:${PORT}`);
  startBot();
});
