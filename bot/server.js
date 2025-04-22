const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const firebase = require("./config/firebase");
const { db } = firebase;

const app = express();
module.exports = app;

const PORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

function loadAuthorizedChannels() {
  return fs.existsSync('authorized_channels.txt')
    ? fs.readFileSync('authorized_channels.txt', 'utf-8').split('\n').filter(Boolean)
    : ['Deafpuma'];
}

// Serve custom HTML at root URL
app.get('/', (req, res) => {
  res.send(`
    <div style="text-align: center; margin-top: 50px;">
      <h1>🧠 Bit Brawls Bot</h1>
      <p>This authorization allows the bot to manage moderator status for timeouts during brawls.</p>
      <a href="https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=https://bit-brawls-backend.onrender.com/callback&response_type=code&scope=moderation:read+moderator:manage:banned_users+chat:read+chat:edit+channel:manage:moderators" style="display: inline-block; padding: 10px 20px; background-color: #6441a5; color: #fff; text-decoration: none; border-radius: 5px; margin-top: 20px;">Authorize Bot</a>
    </div>
  `);
});

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

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

let lastFightData = null;
app.setLastFight = (data) => {
  lastFightData = data;
};
app.get('/latest-fight', (req, res) => {
  if (!lastFightData) {
    return res.status(404).json({ error: 'No fights yet' });
  }
  res.json(lastFightData);
});

app.get('/resolve-login/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    console.log("🔍 Resolving login for user ID:", userId);

    const response = await fetch(`https://api.twitch.tv/helix/users?id=${userId}`, {
      headers: {
        'Client-ID': CLIENT_ID,
        'Authorization': `Bearer ${process.env.API_BEARER.replace(/^oauth:/, '')}`
      }
    });

    const json = await response.json();
    if (!json.data || !json.data.length) {
      return res.status(404).json({ error: 'Login not found' });
    }

    res.json({ login: json.data[0].login });
  } catch (err) {
    console.error("❌ Failed to resolve login:", err.message);
    res.status(500).json({ error: 'Server error resolving login' });
  }
});




app.delete('/leaderboard/:broadcaster/reset', async (req, res) => {
  const { broadcaster } = req.params;

  try {
    const ref = db.collection("leaderboards").doc(broadcaster).collection("players");
    const snapshot = await ref.get();

    const batch = db.batch();
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    res.json({ message: `Leaderboard for ${broadcaster} has been reset.` });
  } catch (err) {
    console.error("❌ Error resetting leaderboard:", err.message);
    res.status(500).json({ error: "Failed to reset leaderboard." });
  }
});



app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 OAuth server running at http://0.0.0.0:${PORT}`);
});

module.exports = app;

require('./bot');
