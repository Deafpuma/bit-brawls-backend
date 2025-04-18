const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

require('./bot');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send(`
    <h1>🧠 Bit Brawls Bot</h1>
    <p>To add the bot to your channel, click below:</p>
    <a href="https://id.twitch.tv/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=https://bit-brawls-backend.onrender.com/callback&response_type=code&scope=moderation:read+moderator:manage:banned_users+chat:read+chat:edit" style="font-size:20px;background:#6441a5;color:#fff;padding:12px 20px;border:none;border-radius:5px;text-decoration:none;">Authorize Bot</a>
  `);
});


app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing ?code from Twitch');

  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: 'https://bit-brawls-backend.onrender.com/callback'
    })
  });

  const data = await response.json();
  if (!data.access_token) return res.status(401).send('❌ Failed to authorize with Twitch');

  const userInfo = await fetch('https://api.twitch.tv/helix/users', {
    headers: {
      'Authorization': `Bearer ${data.access_token}`,
      'Client-ID': process.env.TWITCH_CLIENT_ID
    }
  });

  const user = (await userInfo.json()).data[0];
  if (!user) return res.status(400).send('❌ Unable to fetch Twitch user info');

  const existing = fs.existsSync('authorized_channels.txt')
    ? fs.readFileSync('authorized_channels.txt', 'utf-8').split('\n').filter(Boolean)
    : [];

  if (!existing.includes(user.login)) {
    fs.appendFileSync('authorized_channels.txt', `${user.login}\n`);
  }

  console.log('✅ Authorized:', user.display_name);
  console.log('🔑 Access Token:', data.access_token);

  res.send(`✅ Bot is now authorized to join <strong>${user.display_name}</strong>'s channel! You can now close this tab.`);
});

app.get('/refresh', async (req, res) => {
  const channels = loadAuthorizedChannels();
  const current = client.getChannels().map(c => c.replace('#', ''));
  const newOnes = channels.filter(c => !current.includes(c));
  for (const chan of newOnes) {
    await client.join(chan);
  }
  res.send(`✅ Refreshed and joined: ${newOnes.join(', ')}`);
});


app.listen(PORT, () => {
  console.log(`🌐 OAuth Server running at http://localhost:${PORT}`);
});
