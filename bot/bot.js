const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const tmi = require('tmi.js');
const fs = require('fs');
require('dotenv').config();
const { getBroadcasterToken, db } = require('./config/firebase');


const appRef = require('./server');


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

let blindBrawlTimeouts = {}; 


let channelTimeoutSettings = {};

let pendingBlindBrawlers = {};


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
  "🎖️ {user} joins the elite with {bits} Bits on the line!",
  "🧠 {user} is thinking three moves ahead with {bits} Bits.",
  "💥 {user} burst through the wall like a Kool-Aid man with {bits} Bits!",
  "🐉 {user} summoned a dragon... but paid {bits} Bits for it.",
  "👻 {user} phased in from another dimension with {bits} Bits.",
  "🌪️ {user} is here to stir chaos with {bits} Bits!",
  "🎮 {user} entered with lag and {bits} Bits. Good luck!",
  "🪄 {user} cast a risky spell using {bits} magical Bits.",
  "🪵 {user} built a cabin out of {bits} Bits and now wants a fight.",
  "🧃 {user} drank a juice box and threw in {bits} Bits for battle.",
  "🍌 {user} slipped in carrying {bits} Bits and high hopes.",
  "📡 {user} broadcast their challenge across the galaxy: {bits} Bits!",
  "👽 {user} arrived from space with {bits} Bits and zero chill.",
  "🧙 {user} mumbled a brawl incantation and tossed in {bits} Bits.",
  "🦄 {user} rode a unicorn into the ring with {bits} Bits!",
  "🥸 {user} wore a disguise but forgot to hide {bits} Bits.",
  "🛠️ {user} built momentum with {bits} Bits and duct tape.",
  "🎲 {user} rolled the dice and wagered {bits} Bits. Bold."

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
  `${a.username} is here, and ${b.username} is about to be there.`,
  `${a.username} entered spinning like a Beyblade directly into ${b.username}'s soul!`,
  `${a.username} flew in yelling “I’M YOUR SLEEP PARALYSIS DEMON!” at ${b.username}.`,
  `${a.username} fell from the ceiling tiles, surprising ${b.username}.`,
  `${a.username} moonwalked in, then dabbed on ${b.username}. Bold.`,
  `${a.username} brought snacks and a grudge. ${b.username} better be ready.`,
  `${a.username} screamed “NERF THIS!” and shoulder-checked ${b.username}.`,
  `${a.username} did a cartwheel, backflip, and accidentally kicked ${b.username}.`,
  `${a.username} challenged ${b.username} with a glitter bomb and chaotic energy.`,
  `${a.username} came in hot with a kazoo solo aimed at ${b.username}.`,
  `${a.username} showed up in swim trunks yelling “TIME TO DIVE!” at ${b.username}.`,
  `${a.username} showed up from the future. ${b.username} already lost.`,
  `${a.username} rolled in on a Roomba to confront ${b.username}.`,
  `${a.username} brought a rubber ducky and rage. ${b.username} is not amused.`
    
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
    `📡 ${loser} caught signals from every direction — all bad.`,
    `💀 ${loser} got KO’d so hard they respawned in a different game.`,
    `📉 ${loser}'s stats hit rock bottom — and then started digging.`,
    `🪞 ${loser} lost the fight and their reflection.`,
    `🥫 ${loser} got canned. ${winner} sealed the lid.`,
    `🎂 ${loser} just got served… like a birthday cake.`,
    `🪓 ${loser} got chopped like a cooking show contestant.`,
    `🐣 ${loser} cracked under pressure. Scrambled. Toast.`,
    `🎃 ${loser} got carved like a pumpkin — and not even a good one.`,
    `🚽 ${loser} flushed their chances. RIP.`,
    `🥱 ${winner} won while yawning. ${loser}, that’s embarrassing.`,
    `📴 ${loser} got disconnected mid-defeat.`,
    `🔌 ${winner} unplugged ${loser} from the Matrix.`,
    `🎨 ${loser} became abstract art. No one understood the loss.`,
    `🍜 ${loser} got slurped like discount ramen. Sad but true.`
  
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
    `🪞 ${user} stares at their reflection, ready to brawl in silence.`,
    `🕶️ ${user} slipped into the Bit Brawl shadows.`,
    `🤫 ${user} joined the brawl without saying a word.`,
    `🧤 ${user} quietly laced up for a mysterious match.`,
    `🎭 ${user} entered wearing a mask. No one knows their game.`,
    `🪞 ${user} stared into the void and the void brawled back.`,
    `📦 ${user} entered the brawl... contents unknown.`,
    `💣 ${user} just dropped in anonymously.`,
    `🌫️ ${user} vanished... only to reappear in the brawl queue.`,
    `👤 ${user} joined the match like a ghost in the code.`,
    `🚷 ${user}'s brawl entry is classified. Proceed with caution.`,
    `🎲 ${user} is brawling blind and loving it.`,
    `🎮 ${user} hit 'Start' without a tutorial.`,
    `📦 ${user}'s wager is sealed... somewhere in a mystery box.`,
    `🧃 ${user} sipped their juice and whispered their fate.`,
    `🔮 ${user} entered with cosmic energy. No one knows the wager.`,
    `🛸 ${user} came from Area 51 to brawl with zero context.`,
    `🤯 ${user}'s blind entry confused even the devs.`,
    `🥷 ${user} snuck in, whispered... and disappeared.`,
    `👓 ${user} removed their glasses and whispered dramatically.`,
    `🐇 ${user} hopped down the brawl rabbit hole.`,
    `🧼 ${user} came in squeaky clean and totally unpredictable.`,
    `🍿 ${user} whispered their Bits and started watching chaos.`,

  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

function getBlindFollowup() {
  const lines = [
    "🤫 whisper me how many Bits you want to wager (minimum 5).",
    "🎭 your move... send a whisper with your secret bet.",
    "🕶️ stealth mode engaged — reply in whispers with your Bits.",
    "📩 drop your wager in a whisper... let the mystery begin.",
    "💡 send a whisper with your Bit bet to enter the shadows.",
    "🫥 quietly whisper your Bits and vanish into the queue.",
    "👀 nobody saw you enter... now whisper your wager.",
    "🧤 slide your Bits into the shadows via whisper.",
    "🕳️ toss your Bits into the whisper void — if you dare.",
    "🔐 whisper your Bits. The vault awaits.",
    "🕵️‍♂️ the brawl is classified. Whisper your wager, agent.",
    "🎲 roll your dice in private. Whisper your Bit stake.",
    "💬 whisper your fate. The ring awaits.",
    "🤖 input wager. [CONFIDENTIAL] — send via whisper.",
    "🧛‍♂️ whisper your Bits before the sun rises.",
    "🎩 whisper in style. Mystery equals power.",
    "🍕 whisper your wager like you're ordering pizza at 3AM.",
    "💃 send your whisper like it’s a dance-off in disguise.",
    "🐍 whisper your Bits like a snake in the grass.",
    "👻 whisper like a ghost with a gambling addiction.",
    "🍔 whisper your Bits like you're placing a sketchy burger order.",
    "🌮 send your whisper like it’s taco Tuesday and honor is on the line.",
    "🎤 whisper your bet like you’re dropping a mixtape.",
    "🧙‍♂️ cast your whisper spell. Bit magic is real.",
    "📦 deliver your Bits like a stealth Amazon package.",
    "🧼 whisper like you're cleaning up a shady situation.",
    "🚿 send your whisper like it’s a shower thought.",
    "🚁 whisper like you're parachuting into the brawl.",
    "🪄 abracadabra, now whisper the bet.",
    "📞 this is your final call... whisper the Bits now.",
    "🐸 whisper like Kermit would. You know what that means.",
    "🥷 whisper like you’re flipping in from the ceiling.",
    "🧃 whisper your Bits like it’s juice box diplomacy.",
    "💥 whisper like you just punched your keyboard in suspense.",
    "🪖 this is a covert op. Whisper your wager, soldier.",
    "🧠 big brain moves only. Whisper the bet.",
    "🪐 launch your Bits into orbit via whisper.",
    "🧃 hydrate, then whisper your number. It's protocol.",
    "🐐 whisper your wager. Become the GOAT.",
    "🚪 knock knock. It’s whisper time.",
    "📸 whisper like the paparazzi’s watching.",
    "🎯 send your whisper like you just hit a trick shot.",
    "🐝 buzz into the DMs with that wager, champ.",
    "🦖 whisper like you’re a prehistoric gambler.",
    "🎰 spin the invisible roulette — whisper your number.",
    "🧟 whisper your Bits like you’ve come back from the timeout grave.",
    "🔥 whisper so hot, the Bits start melting.",
    "🌊 surf the wave of mystery — whisper your wager.",
    "🛸 beam up your bet via whisper to enter the intergalactic arena.",
    "🎁 unwrap your destiny with a whisper.",
    "🥚 whisper your Bits like you’re hatching a fight egg.",
    "🎿 ski into my whispers with those secret Bits.",
    "🕰️ whisper now... before the timeline splits again.",
    "🥒 whisper like a pickled prophecy depends on it."
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}


function getRandomKOReason() {
  const reasons = [
    "KO’d in Bit Brawls 🥊",
    "Slapped into the shadow realm 🌪️",
    "Folded like a cheap lawn chair 💺",
    "Silenced by a cartoon punch 🔇",
    "Bit-slammed into next week 💢",
    "💥 KO! got launched into the Shadow Realm!",
    "🥊 got hit so hard they respawned in Minecraft!",
    "💀 rage quit IRL. Brutal!",
    "🚑  just called their mom. It’s over!",
    "🎮 dropped their controller and their dignity.",
    "🔥 was deleted from existence. GG.",
    "🌪️ got swept out of the arena. Oof!",
    "🕳️ fell into a wormhole mid-punch.",
    "🐔 ran off clucking. Chicken confirmed.",
    "🚫 just got banned from life.",
    "💥 got beaned into a loading screen!",
    "📴 just got disconnected from life.",
    "🧹 got swept AND mopped. Clean KO!",
    "🔮 didn’t see that one coming. Fate sealed.",
    "🎲 rolled a nat 1. It’s super effective.",
    "🚀 took off like a bottle rocket. KO confirmed.",
    "📼 defeat is already a Twitch clip.",
    "📉 stock just dropped in real time.",
    "🎭 just got clowned so hard the circus left town.",
    "🪦 found the respawn point the hard way.",
    "🧨 exploded into confetti — we checked.",
    "🍩 left with zero wins and one donut.",
    "🛑 hit the wall and bounced back to the lobby.",
    "📚 just became the example in the rulebook.",
    "🎤 caught a mic drop. To the face.",
    "🧽 got wiped clean like a dry erase board.",
    "🧻 crumbled like a cheap napkin.",
    "🫥 disappeared mid-fight. Poof.",
    "🍕 folded like a pizza slice on a hot day.",
    "🏳️ just surrendered via emoji.",
    "🫠 melted into a puddle. Somebody bring a mop.",
    "🛸 abducted mid-fight. Still missing.",
    "🎬 became the blooper reel of Bit Brawls.",
    "🧊 froze like a busted Windows 98 screen.",
    "📟 just rage quit with a fax machine. Respect.",
    "📍 pinned to the mat with one word: ouch.",
    "🐡 puffed up and floated away.",
    "🍕 folded faster than a slice in New York.",
    "🐒 got dunked on by a monkey with better reflexes.",
    "🌈 just vanished into sparkles. Magical loss.",
    "📺 got turned off like bad cable TV.",
    "💿 got ejected like a scratched CD-ROM.",
    "🔧 couldn’t handle the patch notes. KO.",
    "🧽 wiped clean like a dry-erase board on quiz day."

  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
}

// === Timeout ===
async function timeoutViaAPI(broadcasterId, userId, duration, reason, accessToken, clientId) {
  try {
    const res = await fetch(`https://api.twitch.tv/helix/moderation/bans`, {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        broadcaster_id: broadcasterId,
        moderator_id: broadcasterId,  // broadcaster as the moderator
        data: {
          user_id: userId,
          duration: duration,
          reason: reason
        }
      })
    });

    const text = await res.text();
    if (!res.ok) {
      console.warn(`❌ Timeout failed: ${res.status} ${text}`);
      return false;
    }

    console.log(`✅ Timed out ${userId} via API for ${duration}s: ${reason}`);
    return true;
  } catch (err) {
    console.error(`❌ Timeout API error: ${err.message}`);
    return false;
  }
}


async function unmodViaAPI(broadcasterId, userId, accessToken, clientId) {

  try {
    const res = await fetch(`https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=${broadcasterId}&user_id=${userId}`, {
      method: 'DELETE',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`
      }
      
    });

    const text = await res.text();
    if (!res.ok) {
      console.warn(`❌ Unmod failed: ${res.status} ${text}`);
      return false;
    }

    console.log(`✅ Unmodded user ${userId} via API`);
    return true;
  } catch (err) {
    console.error(`❌ API error unmodding user: ${err.message}`);
    return false;
  }
}


async function modViaAPI(broadcasterId, userId, accessToken, clientId) {
  try {
    const res = await fetch(`https://api.twitch.tv/helix/moderation/moderators`, {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        broadcaster_id: broadcasterId,
        user_id: userId
      })
    });

    const text = await res.text();
    if (!res.ok) {
      console.warn(`❌ Remod failed: ${res.status} ${text}`);
      return false;
    }

    console.log(`✅ Remodded user ${userId} via API`);
    return true;
  } catch (err) {
    console.error(`❌ API error remodding user: ${err.message}`);
    return false;
  }
}

async function isModInChannel(broadcasterId, userId, accessToken, clientId) {
  try {
    const res = await fetch(`https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=${broadcasterId}&user_id=${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-ID': clientId
      }
    });

    if (!res.ok) return false;
    const data = await res.json();
    return data.data && data.data.length > 0;
  } catch (err) {
    console.warn("❌ Mod check error:", err.message);
    return false;
  }
}




async function sendWhisper(fromUserId, toUserId, message, accessToken, clientId) {
  try {
    const res = await fetch(`https://api.twitch.tv/helix/whispers?from_user_id=${fromUserId}&to_user_id=${toUserId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': clientId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.warn(`❌ Whisper API failed: ${res.status} ${errorText}`);
      return false;
    }

    console.log(`✅ Whisper sent to ${toUserId}`);
    return true;
  } catch (err) {
    console.error(`❌ Whisper API error: ${err.message}`);
    return false;
  }
}


async function updateLeaderboard(winner, loser, wagerA, wagerB, broadcasterLogin) {
  const winnerRef = db.collection("leaderboards")
    .doc(broadcasterLogin) // ✅ Use login, not displayName or ID
    .collection("players")
    .doc(winner);

  const loserRef = db.collection("leaderboards")
    .doc(broadcasterLogin)
    .collection("players")
    .doc(loser);

  await db.runTransaction(async (transaction) => {
    const winSnap = await transaction.get(winnerRef);
    const lossSnap = await transaction.get(loserRef);

    const winData = winSnap.exists ? winSnap.data() : { wins: 0, losses: 0, kos: 0, streak: 0 };
    const lossData = lossSnap.exists ? lossSnap.data() : { wins: 0, losses: 0, kos: 0, streak: 0 };

    transaction.set(winnerRef, {
      wins: winData.wins + 1,
      kos: winData.kos + 1,
      streak: winData.streak + 1
    }, { merge: true });

    transaction.set(loserRef, {
      losses: lossData.losses + 1,
      streak: 0
    }, { merge: true });
  });
}



// === Fight ===
function tryStartFight(channelLogin) {
  if (fightInProgress || challengeQueue.length < 2) return;

  const a = challengeQueue.shift();
  const bIndex = challengeQueue.findIndex(f =>
    f.username.toLowerCase() !== a.username.toLowerCase() && (
      (!f.target && !a.target) ||
      f.target === a.username.toLowerCase() ||
      a.target === f.username.toLowerCase()
    )
  );

  if (bIndex === -1) {
    challengeQueue.unshift(a); // Put them back
    return;
  }

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

  const lastFight = {
    winner,
    loser,
    intro,
    roast
  };
  
  if (appRef.setLastFight) {
    appRef.setLastFight(lastFight);
  }

  const loserData = userLoginMap[loser];
  if (loserData?.userId && wagerA > 0 && wagerB > 0) {
    console.log(`🔍 ${loser} mod status:`, loserData);
    await sleep(1000);

    const duration = Math.max(30, Math.min(Math.max(wagerA, wagerB), MAX_TIMEOUT_SECONDS));
    const reason = getRandomKOReason();

    const config = await getBroadcasterToken(channelLogin);
    const actuallyMod = await isModInChannel(config.user_id, loserData.userId, config.access_token, process.env.TWITCH_CLIENT_ID);

    if (actuallyMod) {
      wasModBeforeTimeout[loser] = true;
      console.log(`🧹 Scheduling unmod for ${loser}`);
      await sleep(500);

      const unmodSuccess = await unmodViaAPI(config.user_id, loserData.userId, config.access_token, process.env.TWITCH_CLIENT_ID);
      if (!unmodSuccess) {
        enqueueMessage(channel, `⚠️ Could not unmod ${loser}.`);
      }

      await sleep(1500);
    }

    const timeoutSuccess = await timeoutViaAPI(
      config.user_id,
      loserData.userId,
      duration,
      reason,
      config.access_token,
      process.env.TWITCH_CLIENT_ID
    );

    if (!timeoutSuccess) {
      enqueueMessage(channel, `⚠️ Could not timeout ${loser}.`);
    } else {
      console.log(`✅ Timed out ${loser} via API for ${duration}s: ${reason}`);
    }

    if (wasModBeforeTimeout[loser]) {
      console.log(`🔁 Will remod ${loser} in ${duration} seconds`);
      setTimeout(async () => {
        const config = await getBroadcasterToken(channelLogin); // ✅ fetch fresh credentials
        if (config?.access_token) {
          const remodSuccess = await modViaAPI(config.user_id, loserData.userId, config.access_token, process.env.TWITCH_CLIENT_ID);
          if (remodSuccess) {
            enqueueMessage(channel, `🛡️ ${loser} has been re-modded.`);
          } else {
            enqueueMessage(channel, `⚠️ Failed to remod ${loser}.`);
          }
        } else {
          enqueueMessage(channel, `⚠️ No broadcaster token found to remod ${loser}.`);
        }
        delete wasModBeforeTimeout[loser];
      }, duration * 1000);
    }
  }

  await updateLeaderboard(winner, loser, wagerA, wagerB, channelLogin);


  delete userBitWagers[fighterA.username];
  delete userBitWagers[fighterB.username];
  fightInProgress = false;
}


// === Challenge Message (Blind + Target) ===
function getBlindTargetMessage(fromUser, toUser) {
  const lines = [
    `${fromUser} just sent a shadowy challenge to ${toUser}. The air got colder... ❄️`,
    `${fromUser} locked onto ${toUser} with a blind bet. Something wicked this way brawls. 🧛‍♂️`,
    `${fromUser} challenged ${toUser} from the shadows. A mysterious force stirs. 🌒`,
    `${fromUser} said nothing, but pointed at ${toUser}. The gauntlet is down. 🕶️`,
    `${fromUser} whispered a challenge to ${toUser}—no one else knows what’s coming. 🤐`,
    `${fromUser} slipped ${toUser} a folded note that said: 'Brawl me. No one needs to know.' 📜`
  ];
  return lines[Math.floor(Math.random() * lines.length)];
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
  const isBroadcaster = tags.badges?.broadcaster === '1';

  userLoginMap[username] = {
    login,
    userId,
    isMod: tags.mod || tags.badges?.moderator === '1',
    isBroadcaster: tags.badges?.broadcaster === '1'
  };
  userBroadcasterIdMap[channelLogin] = tags['room-id'];


  if (lowerMsg === '!resetboard' && isBroadcaster) {
    try {
      const ref = db.collection("leaderboards").doc(channelLogin).collection("players");
      const snapshot = await ref.get();

      if (snapshot.empty) {
        return enqueueMessage(channel, `📉 Leaderboard is already empty.`);
      }

      const batch = db.batch();
      snapshot.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      enqueueMessage(channel, `🧹 Leaderboard for ${channelLogin} has been reset.`);
    } catch (err) {
      console.error("❌ Failed to reset leaderboard:", err.message);
      enqueueMessage(channel, `⚠️ Failed to reset the leaderboard.`);
    }
  }


  if (lowerMsg === '!mybet') {
    const bet = userBitWagers[username] || 0;
    return enqueueMessage(channel, `💰 ${username}, your wager is ${bet} Bits.`);
  }

  if (lowerMsg === '!cancel') {
    challengeQueue = challengeQueue.filter(u => u.username !== username);
    for (const [target, challenger] of Object.entries(pendingChallenges)) {
      if (target === username.toLowerCase() || challenger.username === username) {
        delete pendingChallenges[target];
      }
    }
    if (pendingBlindBrawlers[username]) {
      clearTimeout(blindBrawlTimeouts[username]);
      delete pendingBlindBrawlers[username];
      delete blindBrawlTimeouts[username];
    }
    delete userBitWagers[username];
    return enqueueMessage(channel, `🚪 ${username} left the brawl queue.`);
  }

  if (lowerMsg.startsWith('!accept')) {
    const parts = msg.split(' ');
    const target = parts[1]?.toLowerCase();
    const wager = parseInt(parts[2]);

    if (!target || isNaN(wager)) {
      return enqueueMessage(channel, `⚠️ Usage: !accept <username> <bits>`);
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

  if (lowerMsg.startsWith('!setmin') && isBroadcaster) {
    const parts = msg.split(' ');
    const newMin = parseInt(parts[1]);
    if (isNaN(newMin) || newMin < 5) {
      return enqueueMessage(channel, `⚠️ Usage: !setmin <seconds> (minimum 5)`);
    }
    if (!channelTimeoutSettings[channelLogin]) channelTimeoutSettings[channelLogin] = {};
    channelTimeoutSettings[channelLogin].min = newMin;
    return enqueueMessage(channel, `✅ Min timeout set to ${newMin}s for this channel.`);
  }

  if (lowerMsg.startsWith('!setmax') && isBroadcaster) {
    const parts = msg.split(' ');
    const newMax = parseInt(parts[1]);
    if (isNaN(newMax) || newMax < 10) {
      return enqueueMessage(channel, `⚠️ Usage: !setmax <seconds> (minimum 10)`);
    }
    if (!channelTimeoutSettings[channelLogin]) channelTimeoutSettings[channelLogin] = {};
    channelTimeoutSettings[channelLogin].max = newMax;
    return enqueueMessage(channel, `✅ Max timeout set to ${newMax}s for this channel.`);
  }

  if (lowerMsg === '!help') {
    return enqueueMessage(channel, `📜 Use "!brawl [amount]" to enter, "!brawl blind" for mystery, "!accept [user] [bits]" to fight, "!mybet" to check bet, "!cancel" to leave. Leaderboard: https://bit-brawls-backend.onrender.com/panel/index.html`);
  }
  if (lowerMsg === '!blind help') {
    return enqueueMessage(channel, ` "!brawl blind" whisper your bet for mystery, "!accept [user] [bits]" to fight, "!mybet" to check bet, "!cancel" to leave. Leaderboard: https://bit-brawls-backend.onrender.com/panel/index.html`);
  }
  
  

  if (lowerMsg.startsWith('!brawl')) {
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

    if (isBlind) {
      pendingBlindBrawlers[login] = channelLogin;
      blindBrawlTimeouts[login] = setTimeout(() => {
        delete pendingBlindBrawlers[login];
        enqueueMessage(channel, `⌛ ${username}'s blind brawl timed out. They vanished into the mist... 🫥`);
      }, 60000); // ⏱ 60 seconds to respond

      //enqueueMessage(channel, `@${username} ${blindMsg} 🤫 whisper me how many Bits you want to wager (must be 5 or more)..`);
      const blindMsg = getBlindMessage(username);
      const blindFollowup = getBlindFollowup();
      enqueueMessage(channel, `${blindMsg} ${blindFollowup}`);

      return;
    }

    if (bitWager < 5) bitWager = 5;
    userBitWagers[username] = bitWager;

    if (challengeQueue.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return enqueueMessage(channel, `⚠️ ${username}, you're already in the fight queue.`);
    }

    const challenger = { username, target: target, paid: true, isBlind };


    if (!isBlind && target && target !== username.toLowerCase()) {
      pendingChallenges[target] = challenger;
      setTimeout(() => {
        if (pendingChallenges[target] === challenger) {
          delete pendingChallenges[target];
          enqueueMessage(channel, `⌛ ${target} didn’t respond. Challenge expired.`);
        }
      }, 60000);
      return enqueueMessage(channel, `🧨 ${username} challenges ${target}! Use !accept ${username} <bits> to respond.`);
    }

    if (target && target !== username.toLowerCase()) {
      const blindTargetMsg = getBlindTargetMessage(username, target);
      enqueueMessage(channel, blindTargetMsg);
    }

    challengeQueue.push(challenger);
    const msgTemplate = queueMessages[Math.floor(Math.random() * queueMessages.length)]
      .replace('{user}', username)
      .replace('{bits}', bitWager.toString());
    enqueueMessage(channel, msgTemplate);
    tryStartFight(channelLogin);
  }
});

client.on('whisper', (from, userstate, message) => {
  const login = userstate.username;
  const channelLogin = pendingBlindBrawlers[login];
  const bitAmount = parseInt(message.trim());

  if (!channelLogin) return;

  if (isNaN(bitAmount) || bitAmount < 5) {
    client.say(`#${channelLogin}`, `⚠️ ${login}, please whisper a valid number of Bits (minimum is 5).`);
    clearTimeout(blindBrawlTimeouts[login]);
    delete pendingBlindBrawlers[login];
    delete blindBrawlTimeouts[login];
    return;
  }

  clearTimeout(blindBrawlTimeouts[login]);
  delete blindBrawlTimeouts[login];
  delete pendingBlindBrawlers[login];

  userBitWagers[login] = bitAmount;
  const challenger = { username: login, target: null, paid: true };
  challengeQueue.push(challenger);

  const msg = getBlindMessage(login);
  enqueueMessage(`#${channelLogin}`, msg);

  tryStartFight(channelLogin);
});



function startBot() {
  client.connect().then(() => {
    console.log(`✅ Bot connected to Twitch chat in: ${CHANNELS.join(', ')}`);
  }).catch(console.error);
}

// ✅ Always run the bot when required OR run directly
startBot();

