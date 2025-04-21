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


// === Bot State ===
let challengeQueue = [];
let pendingChallenges = {};
let userBitWagers = {};
let userLoginMap = {};
let userBroadcasterIdMap = {};
let fightInProgress = false;
let messageQueue = [];
let sendingMessages = false;
const wasModBeforeTimeout = {};
const MAX_TIMEOUT_SECONDS = 60;

const queueMessages = [
  "🌀 {user} entered the Bit Brawl with {bits} Bits of confidence!",
  "💪 {user} just stepped into the ring wagering {bits} Bits!",
  "🎯 {user} lined up their target with {bits} Bits on the line!",
  "🔥 {user} is ready to throw hands for {bits} Bits!",
  "🕶️ {user} walks in like a boss, risking {bits} Bits!",
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
  `${a.username} moonwalked in while ${b.username} blinked.`,
  `${a.username} challenges ${b.username} with one shoe missing but he's ready to go!`,
  `${a.username} steps in yelling "HOLD MY JUICE!" at ${b.username}!`,
  `${a.username} walks in with glitter boots to face ${b.username}!`,
  `${a.username} bursts in riding a shopping cart straight at ${b.username}!`,
  `${a.username} showed up wearing Crocs and confidence. ${b.username} is doomed.`,
  `${a.username} smacks ${b.username} with a fish and screams “IT'S GO TIME!”`,
  `${a.username} rolled in yelling “I HAVE THE HIGH GROUND!” at ${b.username}.`,
  `${a.username} challenges ${b.username} using only interpretive dance.`,
  `${a.username} jumps out of a bush yelling “BRAWL ME, NERD!” at ${b.username}.`,
  `${a.username} slides in on a banana peel directly into ${b.username}'s face.`,
  `${a.username} came to fight. ${b.username} just came for snacks.`,
  `${a.username} brought a kazoo... and chaos. ${b.username} is nervous.`,
  `${a.username} starts screaming like a goat at ${b.username}. This is war.`,
  `${a.username} just slapped ${b.username} with a wet sock. It’s on.`,
  `${a.username} jumped in like “You rang?” while ${b.username} choked on air.`,
  `${a.username} is powered by caffeine and petty today. ${b.username}, beware.`,
  `${a.username} enters spinning a rubber chicken above their head toward ${b.username}!`,
  `${a.username} asked “You got games on your phone?” and punched ${b.username} mid-sentence.`,
  `${a.username} spawned from the void screaming “BRAWL!” and points at ${b.username}.`,
  `${a.username} cartwheels in yelling “I JUST ATE 3 HOTDOGS LET’S GO!”`,
  `${a.username} smashes through the ceiling screaming “WHY AM I HERE?!” at ${b.username}.`,
  `${a.username} yeets themselves into the ring like it’s a Smash Bros tournament.`,
  `${a.username} summoned a squirrel army they all attacked ${b.username}`,
  `${a.username} moonwalks into the ring and throws glitter in ${b.username}’s eyes.`,
  `${a.username} ran in with a pool noodle and war paint. ${b.username} isn’t ready.`,
  `${a.username} screamed “BABA BOOEY!” and charged ${b.username}.`,
  `${a.username} rips off their shirt to reveal another shirt. ${b.username} is terrified.`,
  `${a.username} points at ${b.username} and says “This is personal… for no reason.”`,
  `${a.username} walked in sipping juice like “I got time today.”`,
  `${a.username} does a split, screams "FOR THE VINE!", and punches ${b.username}.`,
  `${a.username} enters in a bathrobe with a bat and bad intentions.`,
  `${a.username} backflips in with sunglasses yelling “IT’S TIME TO DUEL!”`,
  `${a.username} shows up riding a llama, staring down ${b.username}!`,
  `${a.username} challenges ${b.username} with a juice box and no fear.`,
  `${a.username} moonwalks into the ring to face ${b.username}!`,
  `${a.username} enters flapping like a bird at ${b.username}.`,
  `${a.username} throws down the glitter gauntlet at ${b.username}.`,
  `${a.username} teleports in shouting "I AM THE STORM!" at ${b.username}.`,
  `${a.username} came in wearing crocs and confidence to fight ${b.username}.`,
  `${a.username} launches into the ring via trampoline aimed at ${b.username}.`,
  `${a.username} slaps ${b.username} with a rubber chicken. It's on.`,
  `${a.username} appears from a cloud of smoke ready to slap ${b.username}.`,
  `${a.username} woke up today and chose violence. ${b.username}, prepare.`,
  `${a.username} dropped from the sky Fortnite-style onto ${b.username}.`,
  `${a.username} came in hot with energy drinks and vengeance for ${b.username}.`,
  `${a.username} rides a Segway into the arena to battle ${b.username}.`,
  `${a.username} does 3 cartwheels then stares down ${b.username}.`,
  `${a.username} crashes through the ceiling screaming "${b.username}, FIGHT ME!"`,
  `${a.username} called ${b.username} out during their lunch break.`,
  `${a.username} enters with one sock and all the rage.`,
  `${a.username} is here, and ${b.username} is about to be there.`
    
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

function getRoast(winner, loser) {
  const roasts = [
    `💥 ${loser} got the ice-cream sweats and melted. ${winner} by default!`,
    `⚰️ RIP ${loser} — ${winner} said "sit down."`,
    `🐸 ${loser} caught hands AND feelings.`,
    `🧼 ${winner} washed ${loser} and hung them up to dry.`,
    `🪵 ${loser} just got clapped like a campfire log.`,
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

function getBlindMessage(user) {
  const messages = [
    `👻 ${user} haunts the queue with an unknown stake.`,
    `🎩 ${user} tossed a coin and whispered, "Let's see what happens..."`,
    `🧤 ${user} slipped into the queue like a ghost with gloves.`,
    `👀 ${user} entered a blind brawl. No one knows the wager...`,
    `🕶️ ${user} threw down a mystery bet. Who dares to step up?`,
    `🎲 ${user} is gambling in the shadows. A brawler without fear.`,
    `🤐 ${user} silently entered the arena. The stakes? Unknown.`,
    `⚔️ ${user} has entered a secret match. Bit amount classified.`,
    `🎭 ${user} pulled up wearing a poker face. Hidden wager.`,
    `💣 ${user} dropped into the queue under cloak and dagger.`,
    `📉 ${user} entered a blind brawl. The risk? Undefined.`,
    `🌫️ ${user} fades into the ring with silent confidence.`,
    `🎩 ${user} tossed a coin and whispered, "Let's see what happens..."`,
    `🧤 ${user} slipped into the queue like a ghost with gloves.`,
    `🎰 ${user} spun the wheel without showing their hand.`,
    `🧠 ${user} says “It’s not about the Bits… it’s about the *message*.”`,
    `📜 ${user} signed up for a duel… in invisible ink.`,
    `💼 ${user} brought mystery, power, and… maybe 5 Bits. Maybe 500.`,
    `🧪 ${user} entered a blind test of skill, honor, and mystery.`,
    `🤖 ${user} initiated blind battle protocol. Awaiting challenger...`,
    `🎯 ${user} loaded up… and covered the wager with duct tape.`,
    `👻 ${user} haunts the queue with an unknown stake.`,
    `🪞 ${user} stares at their reflection, ready to brawl in silence.`
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

function getRandomKOReason() {
  const reasons = [
    "KO’d in Bit Brawls 🥊",
    "Slapped into the shadow realm 🌪️",
    "Folded like a cheap lawn chair 💺",
    "Silenced by a cartoon punch 🔇",
    "Bit-slammed into next week 💢",
    "💥 KO! {loser} got launched into the Shadow Realm!",
    "🥊 {loser} got hit so hard they respawned in Minecraft!",
    "💀 {loser} rage quit IRL. Brutal!",
    "🚑 {loser} just called their mom. It’s over!",
    "🎮 {loser} dropped their controller and their dignity.",
    "🔥 {loser} was deleted from existence. GG.",
    "🌪️ {loser} got swept out of the arena. Oof!",
    "🕳️ {loser} fell into a wormhole mid-punch.",
    "🐔 {loser} ran off clucking. Chicken confirmed.",
    "🚫 {loser} just got banned from life.",
    "💥 {loser} got beaned into a loading screen!",
    "📴 {loser} just got disconnected from life.",
    "🧹 {loser} got swept AND mopped. Clean KO!",
    "🔮 {loser} didn’t see that one coming. Fate sealed.",
    "🎲 {loser} rolled a nat 1. It’s super effective.",
    "🚀 {loser} took off like a bottle rocket. KO confirmed.",
    "📼 {loser}'s defeat is already a Twitch clip.",
    "📉 {loser}'s stock just dropped in real time.",
    "🎭 {loser} just got clowned so hard the circus left town.",
    "🪦 {loser} found the respawn point the hard way.",
    "🧨 {loser} exploded into confetti — we checked.",
    "🍩 {loser} left with zero wins and one donut.",
    "🛑 {loser} hit the wall and bounced back to the lobby.",
    "📚 {loser} just became the example in the rulebook.",
    "🎤 {loser} caught a mic drop. To the face.",
    "🧽 {loser} got wiped clean like a dry erase board.",
    "🧻 {loser} crumbled like a cheap napkin.",
    "🫥 {loser} disappeared mid-fight. Poof.",
    "🍕 {loser} folded like a pizza slice on a hot day.",
    "🏳️ {loser} just surrendered via emoji."

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
    console.log(`🔍 ${loser} mod status:`, userLoginMap[loser]);
    await sleep(1000);
    if (userLoginMap[loser]?.isMod) {
      wasModBeforeTimeout[loser] = true;
      enqueueMessage(channel, `🧼 Attempting to unmod ${userLoginMap[loser]?.login}`);

      console.log(`🧹 Scheduling unmod for ${loser}`);
      await sleep(1000); // slight delay
      enqueueMessage(channel, `/unmod ${userLoginMap[loser]?.login}`);


      await sleep(2000); // allow unmod to process
    }
    
    
    const duration = Math.max(30, Math.min(Math.max(wagerA, wagerB), MAX_TIMEOUT_SECONDS));
    //const success = await timeoutViaAPI(channelLogin, loserData.userId, duration);
    const reason = getRandomKOReason();
    client.say(channel, `/timeout ${loser} ${duration} ${reason}`);
    console.log(`✅ Timed out ${loser} for ${duration}s: ${reason}`);

    if (wasModBeforeTimeout[loser]) {
      console.log(`🔁 Remodding ${loser} in ${duration} seconds`);
      setTimeout(() => {
        setTimeout(() => {
          enqueueMessage(channel, `🛡️ Re-modding ${userLoginMap[loser]?.login}`);

          enqueueMessage(channel, `/mod ${userLoginMap[loser]?.login}`);

          console.log(`✅ Remodded ${loser}`);
          delete wasModBeforeTimeout[loser];
        }, 1500); // slight delay to let /timeout settle
      }, duration * 1000);
      
    }
    
    //if (!success) enqueueMessage(channel, `⚠️ Could not timeout ${loser}.`);
  }

  delete userBitWagers[fighterA.username];
  delete userBitWagers[fighterB.username];
  fightInProgress = false;
}

// === Commands ===
client.on('message', async (channel, tags, message, self) => {
  if (self) return;
  if (message.toLowerCase() === '!ping') {
    client.say(channel, `@${tags.username}, Pong! 🏓`);
  }

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
function startBot() {
  client.connect().then(() => {
    console.log(`✅ Bot connected to Twitch chat in: ${CHANNELS.join(', ')}`);
  }).catch(console.error);
}
if (require.main === module) {
  // Running directly (like `node bot.js`)
  startBot();
}
