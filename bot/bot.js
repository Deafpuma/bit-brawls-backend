const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const tmi = require('tmi.js');

const client = new tmi.Client({
  identity: {
    username: 'brawl_bit_bot',
    password: 'oauth:your_oauth_token_here'
  },
  channels: ['Deafpuma']
});

client.connect().then(() => {
  console.log("✅ Bot connected to Twitch chat");
}).catch(console.error);

client.on('message', async (channel, tags, message, self) => {
  if (self) return;

  const username = tags['display-name'];
  const msg = message.trim().toLowerCase();

  if (msg.startsWith('!brawl')) {
    const args = message.split(" ");
    const target = args[1] && isNaN(args[1]) ? args[1] : null;
    const bitAmount = parseInt(args.find(arg => !isNaN(arg)), 10) || 0;

    try {
      const res = await fetch('http://localhost:3005/brawl', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, target, paid: bitAmount > 0, bits: bitAmount })
      });

      if (res.status === 409) {
        client.say(channel, `⚠️ ${username} is already in the fight queue.`);
      } else {
        const message = bitAmount > 0
          ? `🧨 ${username} enters the fight (wagering ${bitAmount} Bits!)`
          : `📝 ${username} has entered the fight queue${target ? ` (vs ${target})` : "!"}`;
        client.say(channel, message);
      }
    } catch (err) {
      console.error(err);
      client.say(channel, `❌ Error processing your brawl request, ${username}.`);
    }
  }
});

async function trashTalkAndTimeout(winner, loser, introLine, paidA, paidB) {
  const channel = 'Deafpuma';
  const sleep = ms => new Promise(res => setTimeout(res, ms));

  await sleep(500);
  await client.say(channel, `🥊 ${introLine}`);

  await sleep(1000);
  if (paidA && !paidB) {
    await client.say(channel, `💰 ${loser} didn’t match Bits — ${winner} auto-wins!`);
  } else if (!paidA && paidB) {
    await client.say(channel, `💰 ${loser} didn’t match Bits — ${winner} auto-wins!`);
  } else {
    await client.say(channel, `🎲 Both wagered — it’s a 50/50!`);
  }

  await sleep(1000);
  await client.say(channel, `🏆 ${winner} WINS! 💀 ${loser} has been KO'd!`);

  const messages = [
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

  await sleep(1000);
  await client.say(channel, messages[Math.floor(Math.random() * messages.length)]);

  if (paidA && paidB) {
    await sleep(800);
    await client.say(channel, `/timeout ${loser} 60`);
  }
}

module.exports = {
  trashTalkAndTimeout
};
