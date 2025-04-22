const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');
require('dotenv').config();
const firebase = require("./config/firebase");
const { db } = firebase;

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

function loadAuthorizedChannels() {
  return fs.existsSync('authorized_channels.txt')
    ? fs.readFileSync('authorized_channels.txt', 'utf-8').split('\n').filter(Boolean)
    : ['Deafpuma'];
}

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <style>
          body {
            background-color: #121212;
            color: #f1f1f1;
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 2rem;
          }
          a.button {
            display: inline-block;
            background-color: #ffcc00;
            color: #121212;
            padding: 1rem 2rem;
            font-size: 1.2rem;
            font-weight: bold;
            text-decoration: none;
            border-radius: 10px;
            margin-top: 1rem;
          }
          p {
            max-width: 600px;
            text-align: center;
            font-size: 1rem;
            margin-top: 1rem;
            color: #ccc;
          }
        </style>
      </head>
      <body>
        <h1>🧠 Bit Brawls Bot Setup</h1>
        <a class="button" href="https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=https://bit-brawls-backend.onrender.com/callback&response_type=code&scope=moderation:read+moderator:manage:banned_users+chat:read+chat:edit+channel:manage:moderators">Authorize Bot</a>
        <p>
          This allows Bit Brawls to timeout and remod users correctly after a fight. 
          It’s required so the bot can unmod mods before timing them out (and remod them after).
        </p>
      </body>
    </html>
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

  await firebase.saveBroadcasterToken(user.login, {
    user_id: user.id,
    login: user.login,
    access_token: tokenData.access_token,
    client_id: CLIENT_ID
  });

  res.send(`✅ Bot added to <strong>${user.display_name}</strong>'s channel and token saved.`);
});

app.get("/leaderboard/:broadcaster", async (req, res) => {
  const { broadcaster } = req.params;
  const snapshot = await db.collection("leaderboards").doc(broadcaster).collection("players").get();
  const data = snapshot.docs.map(doc => ({ username: doc.id, ...doc.data() }));
  data.sort((a, b) => (b.wins || 0) - (a.wins || 0));
  res.json(data);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 OAuth server running at http://0.0.0.0:${PORT}`);
});

require('./bot');