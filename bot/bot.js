// ✨ Finalized Bit Brawls Bot (Working)
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
  identity: { username: 'brawl_bit_bot', password: CHAT_OAUTH },
  channels: CHANNELS
});

client.connect().then(() => {
  console.log(`✅ Bot connected to Twitch chat in: ${CHANNELS.join(', ')}`);
}).catch(console.error);

// Minimal version to confirm it replies in chat
client.on('message', (channel, tags, message, self) => {
  if (self) return;
  const username = tags['display-name'];
  const lower = message.trim().toLowerCase();

  if (lower === '!ping') {
    client.say(channel, `🏓 Pong! Hello ${username}`);
  }

  if (lower === '!bitbrawl') {
    client.say(channel, `📝 ${username} enters the ring with 50 Bits. Who's next?`);
  }
});