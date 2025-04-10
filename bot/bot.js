const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const tmi = require('tmi.js');

const client = new tmi.Client({
  identity: {
    username: 'brawl_bit_bot',
    password: 'oauth:ys0kiu70r01p9ixjedjjwxo3135t7d'
  },
  channels: ['Deafpuma']
});

client.connect().then(() => {
  console.log("✅ Bot connected to Twitch chat");
}).catch(console.error);

let challengeQueue = [];
let pendingChallenges = {};
let userBitWagers = {};
let fightInProgress = false;
let MAX_TIMEOUT_SECONDS = 60;

client.on('message', async (channel, tags, message, self) => {
  if (self) return;

  const msg = message.trim().toLowerCase();
  const username = tags['display-name'];

  
  if (msg === '!help') {
    return client.say(channel, `📖 Commands: 
  !bitbrawl — Join the fight queue. 
  !bitbrawl @user — Challenge a specific opponent. 
  !bitbrawl @user <bits> or !bitbrawl <bits> @user — Challenge and wager. 
  !bitbrawl <bits> — Join the queue with a wager.
  !bits <amount> — Set or update your wager. 
  !mybet — View your current wager. 
  !accept — Accept a challenge (if someone challenged you).
  !settimeout <sec> — Set max timeout after KO (broadcaster only).`);
  }
  

  // 🔧 Let broadcaster set max timeout
  if (msg.startsWith('!settimeout') && tags.badges?.broadcaster) {
    const parts = msg.split(' ');
    const amount = parseInt(parts[1]);

    if (!isNaN(amount) && amount > 0 && amount <= 600) {
      MAX_TIMEOUT_SECONDS = amount;
      return client.say(channel, `⏱️ Timeout duration set to ${amount} seconds.`);
    } else {
      return client.say(channel, `❌ Please enter a valid timeout between 1–600 seconds.`);
    }
  }

  // 💥 Handle !bitbrawl
  if (msg.startsWith('!bitbrawl')) {
    const args = msg.split(' ');
    let target = null;
    let bitWager = 0;

    if (args.length > 1) {
      for (const arg of args.slice(1)) {
        if (!isNaN(parseInt(arg))) {
          bitWager = parseInt(arg);
        } else if (arg.startsWith('@')) {
          target = arg.replace('@', '').toLowerCase();
        } else {
          target = arg.toLowerCase();
        }
      }
    }

    if (challengeQueue.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      return client.say(channel, `⚠️ ${username}, you're already in the fight queue.`);
    }

    const challenger = { username, target, paid: true };
    if (bitWager > 0) userBitWagers[username] = bitWager;

    if (target && target !== username.toLowerCase()) {
      pendingChallenges[target] = challenger;
      return client.say(channel, `🧨 ${username} challenges ${target}! Waiting for ${target} to type !accept...`);
    }

    challengeQueue.push(challenger);
    const wagerText = bitWager > 0 ? `with ${bitWager} Bits` : 'with no wager yet';
    client.say(channel, `📝 ${username} enters the fight queue (vs anyone brave enough) ${wagerText}.`);
    tryStartFight();
  }

  // 💸 Handle !bits
  if (msg.startsWith('!bits')) {
    const args = msg.split(' ');
    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount <= 0) {
      return client.say(channel, `❌ ${username}, please enter a valid bit amount like "!bits 100"`);
    }
    userBitWagers[username] = amount;
    client.say(channel, `💰 ${username} is wagering ${amount} Bits!`);
  }

  // 📊 Show current bet
  if (msg === '!mybet') {
    const bet = userBitWagers[username] || 0;
    client.say(channel, `💰 ${username}, your current wager is ${bet} Bits.`);
  }

  // ✅ Accept challenge
  if (msg === '!accept') {
    const accepter = username.toLowerCase();
    const challenger = pendingChallenges[accepter];
    if (challenger) {
      delete pendingChallenges[accepter];
      challengeQueue = challengeQueue.filter(c => c.username !== challenger.username);
      const opponent = { username, target: null, paid: true };
      client.say(channel, `⚔️ ${username} accepted the challenge from ${challenger.username}!`);
      runFight(challenger, opponent);
    }
  }
});

function tryStartFight() {
  if (fightInProgress) return;

  // Only auto-match users with 0 wager or both with same wager
  const matchIndex = challengeQueue.findIndex((fighterA, i) => {
    for (let j = i + 1; j < challengeQueue.length; j++) {
      const fighterB = challengeQueue[j];
      const wagerA = userBitWagers[fighterA.username] || 0;
      const wagerB = userBitWagers[fighterB.username] || 0;
      if (wagerA === 0 && wagerB === 0) return true;
      if (wagerA === wagerB && wagerA > 0) return true;
    }
    return false;
  });

  if (matchIndex !== -1) {
    const [a] = challengeQueue.splice(matchIndex, 1);
    const bIndex = challengeQueue.findIndex(f => f.username !== a.username);
    const [b] = challengeQueue.splice(bIndex, 1);
    runFight(a, b);
  }
}


async function runFight(fighterA, fighterB) {
  fightInProgress = true;
  const channel = 'Deafpuma';
  const sleep = ms => new Promise(res => setTimeout(res, ms));

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


  const intro = intros[Math.floor(Math.random() * intros.length)];
  await client.say(channel, `🥊 ${intro}`);
  await sleep(1000);

  const wagerA = userBitWagers[fighterA.username] || 0;
  const wagerB = userBitWagers[fighterB.username] || 0;

  if (wagerA && !wagerB) {
    await client.say(channel, `💰 ${fighterB.username} didn't match the wager — ${fighterA.username} auto-wins!`);
    fightInProgress = false;
    return;
  } else if (!wagerA && wagerB) {
    await client.say(channel, `💰 ${fighterA.username} didn't match the wager — ${fighterB.username} auto-wins!`);
    fightInProgress = false;
    return;
  }

  await client.say(channel, `🎲 ${fighterA.username} wagered ${wagerA} Bits vs ${fighterB.username} wagered ${wagerB} Bits! It's on!`);
  await sleep(1000);

  const winner = Math.random() > 0.5 ? fighterA.username : fighterB.username;
  const loser = winner === fighterA.username ? fighterB.username : fighterA.username;


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

  const rawRoast = roasts[Math.floor(Math.random() * roasts.length)];
  const roast = rawRoast.replace(/{winner}/g, winner).replace(/{loser}/g, loser);

  const finalMessage = `🏆 ${winner} WINS! 💀 ${loser} KO'd!\n${roast}`;
  await client.say(channel, finalMessage);



  // Only timeout if both players wagered
  if (wagerA > 0 && wagerB > 0) {
    const timeoutDuration = Math.min(Math.max(wagerA, wagerB), MAX_TIMEOUT_SECONDS);
    await sleep(800);
    await client.timeout(channel, loser, timeoutDuration, `KO'd in Bit Brawls`)
    .catch(err => console.warn("⚠️ Timeout failed:", err.message));

  }

  delete userBitWagers[fighterA.username];
  delete userBitWagers[fighterB.username];

  //await fetch('http://localhost:3005/set-fight', {
  //  method: "POST",
  //  headers: { "Content-Type": "application/json" },
  //  body: JSON.stringify({ intro, winner, loser })
  //});


  await fetch("https://bit-brawls-backend.onrender.com/set-fight", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ intro, winner, loser })
  }).catch(err => console.warn("⚠️ Overlay error:", err.message));

  fightInProgress = false;
}
