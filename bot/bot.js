const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const tmi = require('tmi.js');
const admin = require('firebase-admin');

const credentials = JSON.parse(
  Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(credentials)
});


const client = new tmi.Client({
  identity: {
    username: 'brawl_bit_bot',
        password: 'oauth:8oiyu6mb9saoau4pkfg615xriq7dwt'

  },
  channels: ['Deafpuma']
});

client.connect().then(() => {
  console.log("✅ Bot connected to Twitch chat");
}).catch(console.error);

let challengeQueue = [];
let pendingChallenges = {};
let userBitWagers = {};
let userLoginMap = {};
let userBroadcasterIdMap = {};
let fightInProgress = false;
let MAX_TIMEOUT_SECONDS = 60;
let messageQueue = [];
let sendingMessages = false;

const CLIENT_ID = 'gp762nuuoqcoxypju8c569th9wz7q5';
const ACCESS_TOKEN = '8oiyu6mb9saoau4pkfg615xriq7dwt';
const MODERATOR_ID = '1292553340';

function enqueueMessage(channel, msg) {
  messageQueue.push({ channel, msg });
  if (!sendingMessages) processMessageQueue();
}

async function processMessageQueue() {
  if (messageQueue.length === 0) {
    sendingMessages = false;
    return;
  }
  sendingMessages = true;
  const { channel, msg } = messageQueue.shift();
  await client.say(channel, msg);
  setTimeout(processMessageQueue, 1000);
}

const queueMessages = [
  "📝 {user} enters the ring with {bits} Bits. Who's next?",
  "👊 {user} is locked and loaded with {bits} Bits!",
  "🔥 {user} throws {bits} Bits on the line. Let the brawls begin!",
  "💥 {user} enters the queue with {bits} Bits and mean intentions.",
  "🪙 {user} just gambled {bits} Bits on mayhem!",
  "⚔️ {user} sharpens their fists and enters with {bits} Bits.",
  "🎲 {user} rolls into the queue wagering {bits} Bits.",
  "🚀 {user} launched a {bits} Bit challenge into the queue!",
  "😈 {user} taunts the next brawler with {bits} Bits!",
  "🎯 {user} joins with {bits} Bits and deadly aim.",
  "🧨 {user} lights the fuse with {bits} Bits!",
  "🎮 {user} enters the game. {bits} Bits at stake!",
  "🤺 {user} joins the duel arena with {bits} Bits.",
  "📢 {user} shouts their entrance. {bits} Bits up for grabs!",
  "🎉 {user} joins the fight queue like a champ. {bits} Bits on deck!",
  "🕹️ {user} toggled rage mode with {bits} Bits!",
  "📣 {user} enters like a storm! {bits} Bits wagered!",
  "💰 {user} drops {bits} Bits like a boss!",
  "🎤 {user} said \"Let’s go!\" with {bits} Bits.",
  "🥷 {user} sneaks into the ring with {bits} Bits ready to throw down!",
  "🧤 {user} laced up and threw {bits} Bits into the pit!",
  "🎖️ {user} joins the elite with {bits} Bits on the line!"
];
function getIntro(fighterA, fighterB) {
  const intros = [
    `${fighterA.username} challenges ${fighterB.username} with one shoe missing but he's ready to go!`,
    `${fighterA.username} steps in yelling \"HOLD MY JUICE!\" at ${fighterB.username}!`,
    `${fighterA.username} walks in with glitter boots to face ${fighterB.username}!`,
    `${fighterA.username} bursts in riding a shopping cart straight at ${fighterB.username}!`,
    `${fighterA.username} showed up wearing Crocs and confidence. ${fighterB.username} is doomed.`,
    `${fighterA.username} smacks ${fighterB.username} with a fish and screams “IT'S GO TIME!”`,
    `${fighterA.username} rolled in yelling “I HAVE THE HIGH GROUND!” at ${fighterB.username}.`,
    `${fighterA.username} challenges ${fighterB.username} using only interpretive dance.`,
    `${fighterA.username} jumps out of a bush yelling “BRAWL ME, NERD!” at ${fighterB.username}.`,
    `${fighterA.username} slides in on a banana peel directly into ${fighterB.username}'s face.`,
    `${fighterA.username} came to fight. ${fighterB.username} just came for snacks.`,
    `${fighterA.username} brought a kazoo... and chaos. ${fighterB.username} is nervous.`,
    `${fighterA.username} starts screaming like a goat at ${fighterB.username}. This is war.`,
    `${fighterA.username} just slapped ${fighterB.username} with a wet sock. It’s on.`,
    `${fighterA.username} jumped in like “You rang?” while ${fighterB.username} choked on air.`,
    `${fighterA.username} is powered by caffeine and petty today. ${fighterB.username}, beware.`,
    `${fighterA.username} enters spinning a rubber chicken above their head toward ${fighterB.username}!`,
    `${fighterA.username} asked “You got games on your phone?” and punched ${fighterB.username} mid-sentence.`,
    `${fighterA.username} spawned from the void screaming “BRAWL!” and points at ${fighterB.username}.`,
    `${fighterA.username} cartwheels in yelling “I JUST ATE 3 HOTDOGS LET’S GO!”`,
    `${fighterA.username} smashes through the ceiling screaming “WHY AM I HERE?!” at ${fighterB.username}.`,
    `${fighterA.username} yeets themselves into the ring like it’s a Smash Bros tournament.`,
    `${fighterA.username} summoned a squirrel army they all attacked ${fighterB.username}`,
    `${fighterA.username} moonwalks into the ring and throws glitter in ${fighterB.username}’s eyes.`,
    `${fighterA.username} ran in with a pool noodle and war paint. ${fighterB.username} isn’t ready.`,
    `${fighterA.username} screamed “BABA BOOEY!” and charged ${fighterB.username}.`,
    `${fighterA.username} rips off their shirt to reveal another shirt. ${fighterB.username} is terrified.`,
    `${fighterA.username} points at ${fighterB.username} and says “This is personal… for no reason.”`,
    `${fighterA.username} walked in sipping juice like “I got time today.”`,
    `${fighterA.username} does a split, screams "FOR THE VINE!", and punches ${fighterB.username}.`,
    `${fighterA.username} enters in a bathrobe with a bat and bad intentions.`,
    `${fighterA.username} backflips in with sunglasses yelling “IT’S TIME TO DUEL!”`,
    `${fighterA.username} shows up riding a llama, staring down ${fighterB.username}!`,
    `${fighterA.username} challenges ${fighterB.username} with a juice box and no fear.`,
    `${fighterA.username} moonwalks into the ring to face ${fighterB.username}!`,
    `${fighterA.username} enters flapping like a bird at ${fighterB.username}.`,
    `${fighterA.username} throws down the glitter gauntlet at ${fighterB.username}.`,
    `${fighterA.username} teleports in shouting "I AM THE STORM!" at ${fighterB.username}.`,
    `${fighterA.username} came in wearing crocs and confidence to fight ${fighterB.username}.`,
    `${fighterA.username} launches into the ring via trampoline aimed at ${fighterB.username}.`,
    `${fighterA.username} slaps ${fighterB.username} with a rubber chicken. It's on.`,
    `${fighterA.username} appears from a cloud of smoke ready to slap ${fighterB.username}.`,
    `${fighterA.username} woke up today and chose violence. ${fighterB.username}, prepare.`,
    `${fighterA.username} dropped from the sky Fortnite-style onto ${fighterB.username}.`,
    `${fighterA.username} came in hot with energy drinks and vengeance for ${fighterB.username}.`,
    `${fighterA.username} rides a Segway into the arena to battle ${fighterB.username}.`,
    `${fighterA.username} does 3 cartwheels then stares down ${fighterB.username}.`,
    `${fighterA.username} crashes through the ceiling screaming "${fighterB.username}, FIGHT ME!"`,
    `${fighterA.username} called ${fighterB.username} out during their lunch break.`,
    `${fighterA.username} enters with one sock and all the rage.`,
    `${fighterA.username} is here, and ${fighterB.username} is about to be there.`,
    `${fighterA.username} just unplugged the router to gain an advantage over ${fighterB.username}.`
  ];
  return intros[Math.floor(Math.random() * intros.length)];
}



function getRoast(winner, loser) {
  const roasts = [
    `💥 ${loser} got folded like a lawn chair by ${winner}!`,
    `🔥 ${loser} is the human equivalent of a participation trophy. Good try I guess.`,
    `⚰️ RIP ${loser} — ${winner} said "sit down."`,
    `💣 ${winner} KO’d ${loser} with a flying elbow!`,
    `🥶 ${loser} got the ice cream sweats and melted. ${winner} wins by default.`,
    `💥 ${loser} was last seen orbiting Saturn. Good hit, ${winner}.`,
    `☠️ ${loser} just evaporated. ${winner} didn’t even blink.`,
    `🧼 ${winner} washed ${loser} and hung them up to dry.`,
    `🚑 ${loser} was escorted out via imaginary ambulance.`,
    `🍕 ${loser} folded like a slice of pizza — sloppy and fast.`,
    `🎮 ${loser} rage quit and unplugged their router.`,
    `🐸 ${loser} caught hands AND feelings.`,
    `🍞 ${loser} just got toasted. ${winner} is butterin' up.`,
    `🔥 ${winner} sent ${loser} back to the tutorial.`,
    `🛑 ${loser} pressed Alt+F4 irl.`,
    `🧀 ${loser} got melted like fondue. ${winner} dipped out.`,
    `🎯 ${winner} landed a hit so clean it got a Michelin star.`,
    `🎢 ${loser} took the L and a ride on the shame coaster.`,
    `📦 ${loser} just got express shipped to defeat.`,
    `🥶 ${loser} froze mid-punch like Windows 98.`,
    `🌪️ ${loser} got swept up and forgotten.`,
    `📉 ${loser}’s skill level just got delisted.`,
    `🪦 ${loser} now belongs to the shadow realm.`,
    `🚫 ${loser} was denied access to the winner's circle.`,
    `🎩 ${winner} pulled victory out of a clown hat.`,
    `🧻 ${loser} got wiped like a whiteboard.`,
    `👟 ${loser} got stomped out in light-up Skechers.`,
    `💤 ${winner} put ${loser} to sleep with one tap.`,
    `🌊 ${loser} got splashed out of the arena.`,
    `📢 ${winner} yelled "BOOM" and ${loser} exploded from fear.`,
    `🪵 ${loser} just got clapped like a campfire log.`,
    `🕶️ ${loser} didn’t see it coming. Should’ve worn shades.`,
    `🎈 ${loser} popped like a balloon. Sad noise.`,
    `🎅 ${loser} made Santa’s naughty list just from this L.`,
    `📱 ${loser} got blocked, reported, and muted.`,
    `💼 ${winner} gave ${loser} the business. And the invoice.`,
    `🐌 ${loser} moved too slow. Got slow-cooked.`,
    `💊 ${loser} just took the L-pill. ${winner} prescribed it.`,
    `🍩 ${loser} left the arena with zero wins and one donut.`,
    `🎨 ${winner} painted the floor with ${loser}’s pride.`,
    `🔕 ${loser} got silenced like a bad ringtone.`,
    `🎤 ${winner} dropped the mic... on ${loser}’s shoulder and was like yeah that hurt uh?!.`,
    `🧂 ${loser} is salty. Confirmed.`,
    `🏚️ ${loser} got evicted mid-fight. ${winner} owns the ring.`,
    `🍦 ${loser} melted like soft serve. Yikes.`,
    `🐍 ${loser} slithered in, got smacked, slithered out.`,
    `🎻 ${winner} played a tiny violin after the KO.`,
    `📚 ${loser} just became an example in the rulebook.`,
    `🐐 ${winner} is the GOAT. ${loser} just the “guh.”`,
    `🐙 ${loser} got slapped 8 times. Weird, but effective.`,
    `🧟 ${loser} came back to life... only to catch it again.`,
    `🎩 ${winner} turned ${loser} into a disappearing act.`,
    `🌮 ${loser} got crunched like a bad taco.`,
    `🦆 ${loser} waddled in, flew out. ${winner} wins.`,
    `📡 ${loser} caught signals from every direction — all bad.`
  ];
  return roasts[Math.floor(Math.random() * roasts.length)];
}

const blindMessages = [
  `👀 {user} entered a blind brawl. No one knows the wager...`,
  `🕶️ {user} threw down a mystery bet. Who dares to step up?`,
  `🎲 {user} is gambling in the shadows. A brawler without fear.`,
  `🤐 {user} silently entered the arena. The stakes? Unknown.`,
  `⚔️ {user} has entered a secret match. Bit amount classified.`,
  `🎭 {user} pulled up wearing a poker face. Hidden wager.`,
  `💣 {user} dropped into the queue under cloak and dagger.`,
  `📉 {user} entered a blind brawl. The risk? Undefined.`,
  `🌫️ {user} fades into the ring with silent confidence.`,
  `🎩 {user} tossed a coin and whispered, "Let's see what happens..."`,
  `🧤 {user} slipped into the queue like a ghost with gloves.`,
  `🎰 {user} spun the wheel without showing their hand.`,
  `🧠 {user} says “It’s not about the Bits… it’s about the *message*.”`,
  `📜 {user} signed up for a duel… in invisible ink.`,
  `💼 {user} brought mystery, power, and… maybe 5 Bits. Maybe 500.`,
  `🧪 {user} entered a blind test of skill, honor, and mystery.`,
  `🤖 {user} initiated blind battle protocol. Awaiting challenger...`,
  `🎯 {user} loaded up… and covered the wager with duct tape.`,
  `👻 {user} haunts the queue with an unknown stake.`,
  `🪞 {user} stares at their reflection, ready to brawl in silence.`
];


client.on('message', async (channel, tags, message, self) => {
    if (lowerMsg === '!bottest') {
      try {
        const testRef = admin.firestore().collection('debug').doc('connection_test');
        await testRef.set({
          bot: 'brawl_bit_bot',
          timestamp: new Date().toISOString(),
          user: username
        });
        return enqueueMessage(channel, `✅ Firebase write success! Bot is connected as ${username}.`);
      } catch (err) {
        console.error("🔥 Firebase write failed:", err);
        return enqueueMessage(channel, `❌ Firebase write failed. Check logs.`);
      }
    }

    if (lowerMsg === '!readtest') {
      try {
        const snap = await admin.firestore().collection('debug').doc('connection_test').get();
        const data = snap.data();
        return enqueueMessage(channel, `🧠 Read from Firebase: ${data.user} at ${data.timestamp}`);
      } catch (err) {
        return enqueueMessage(channel, `❌ Read failed.`);
      }
    }

  if (self) return;

  const msg = message.trim();
  const username = tags['display-name'];
  const login = tags.username;
  const userId = tags['user-id'];
  const channelLogin = channel.replace('#', '');

  userLoginMap[username] = { login, userId };
  userBroadcasterIdMap[channelLogin] = tags['room-id'];

  const lowerMsg = msg.toLowerCase();

  if (lowerMsg === '!bblb' || lowerMsg === '!bbleaderboard') {
    const snapshot = await db.collection(`leaderboards/${channelLogin}/users`).orderBy('wins', 'desc').limit(5).get();
    const top = snapshot.docs.map((doc, i) => {
      const d = doc.data();
      return `${i + 1}. ${doc.id} (${d.wins || 0} wins, ${d.bits || 0} Bits)`;
    });
    return enqueueMessage(channel, `🏆 Leaderboard:\n${top.join(' | ')}`);
  }

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
      return enqueueMessage(channel, `⚠️ Usage: !bbaccept <username> <bits>. Example: !bbaccept Deafpuma 50`);
    }

    userBitWagers[username] = Math.max(wager, 5);
    const challenger = pendingChallenges[username.toLowerCase()];

    if (challenger?.username.toLowerCase() === target) {
      if (userBitWagers[username] !== userBitWagers[challenger.username]) {
        return enqueueMessage(channel, `⚠️ Wager must match the challenge. ${challenger.username} bet ${userBitWagers[challenger.username]} Bits.`);
      }

      delete pendingChallenges[username.toLowerCase()];
      challengeQueue = challengeQueue.filter(c => c.username !== challenger.username);

      const opponent = { username, target: null, paid: true };
      enqueueMessage(channel, `⚔️ ${username} accepted the challenge from ${challenger.username} for ${wager} Bits!`);
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
          enqueueMessage(channel, `⌛ ${target} did not respond in time. Challenge cancelled.`);
        }
      }, 60000);
      return enqueueMessage(channel, `🧨 ${username} challenges ${target}! Waiting for ${target} to type !bbaccept ${username} <bits>`);
    }

    challengeQueue.push(challenger);
    const template = isBlind
  ? blindMessages[Math.floor(Math.random() * blindMessages.length)].replace('{user}', username)
  : queueMessages[Math.floor(Math.random() * queueMessages.length)]
      .replace('{user}', username)
      .replace('{bits}', bitWager.toString());

    enqueueMessage(channel, template);
    tryStartFight(channelLogin);
  }
});

function tryStartFight(channelLogin) {
  if (fightInProgress || challengeQueue.length < 2) return;

  const a = challengeQueue.shift();

  const bIndex = challengeQueue.findIndex(f =>
    (!f.target && !a.target) || 
    f.target === a.username.toLowerCase() || 
    a.target === f.username.toLowerCase()    
  );

  if (bIndex === -1) {
    challengeQueue.unshift(a); 
    return;
  }

  const b = challengeQueue.splice(bIndex, 1)[0];
  runFight(a, b, channelLogin);
}


async function timeoutViaAPI(channelLogin, userId, duration) {
  const broadcasterId = userBroadcasterIdMap[channelLogin];
  if (!broadcasterId) return false;

  try {
    const res = await fetch('https://api.twitch.tv/helix/moderation/bans', {
      method: 'POST',
      headers: {
        'Client-ID': CLIENT_ID,
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        broadcaster_id: broadcasterId,
        moderator_id: MODERATOR_ID,
        data: {
          user_id: userId,
          duration,
          reason: "KO'd in Bit Brawls"
        }
      })
    });
    return res.ok;
  } catch (err) {
    console.warn("⚠️ Timeout error:", err.message);
    return false;
  }
}

async function updateStats(winner, bits) {
  const doc = db.collection(`leaderboards/Deafpuma/users`).doc(winner);
  await doc.set({
    wins: admin.firestore.FieldValue.increment(1),
    bits: admin.firestore.FieldValue.increment(bits)
  }, { merge: true });
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

  const winner = Math.random() > 0.5 ? fighterA.username : fighterB.username;
  const loser = winner === fighterA.username ? fighterB.username : fighterA.username;

  const roast = getRoast(winner, loser);
  await client.say(channel, `🏆 ${winner} WINS! 💀 ${loser} KO'd! ${roast}`);
  await sleep(5000);

  if (wagerA > 0 && wagerB > 0) {
    const timeoutDuration = Math.max(30, Math.min(Math.max(wagerA, wagerB), 60));
    const loserData = userLoginMap[loser];
    if (loserData?.userId) {
      const success = await timeoutViaAPI(channelLogin, loserData.userId, timeoutDuration);
      if (!success) enqueueMessage(channel, `⚠️ Could not timeout ${loser}.`);
    }
  }

  await updateStats(winner, Math.max(wagerA, wagerB));

  delete userBitWagers[fighterA.username];
  delete userBitWagers[fighterB.username];

  await fetch("https://bit-brawls-backend.onrender.com/set-fight", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ intro, winner, loser })
  }).catch(err => console.warn("⚠️ Overlay error:", err.message));

  fightInProgress = false;
}
