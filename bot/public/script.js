
let userId = null;
let fightInProgress = false;
let soundIsPlaying = false;
let overlayMuted = false;
let userBitWagers = {};

const koMessages = [
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


function showGifOverlay(gifFile, duration = 2500) {
  const gif = document.createElement("img");
  gif.src = `gifs/${gifFile}`;
  gif.className = "gif-overlay";
  document.body.appendChild(gif);
  setTimeout(() => gif.remove(), duration);
}

function triggerFightVisuals(intro, winner, loser) {
  if (fightInProgress) return;
  fightInProgress = true;

  const log = document.getElementById("fight-log");
  const koLine = koMessages[Math.floor(Math.random() * koMessages.length)].replace("{loser}", loser);
  const line = `${winner} lands a critical hit on ${loser}!`;
  log.innerHTML = `🥊 ${intro}<br>🏆 <strong>${winner}</strong> wins the fight!<br>${line}<br>${koLine}`;


  const pow = document.createElement("div");
  pow.innerHTML = `<div class='pow-text'>💥 POW!</div>`;
  document.getElementById("container").appendChild(pow);
  setTimeout(() => pow.remove(), 1500);

  setTimeout(() => {
    const gifs = ["BitPOW.gif", "BitBoom.gif", "KO_Gif.gif"];
    showGifOverlay(gifs[Math.floor(Math.random() * gifs.length)], 2500);
  }, 1800);

  setTimeout(() => fightInProgress = false, 3000);
}

async function pollLatestFight() {
  try {
    const res = await fetch("https://bit-brawls-backend.onrender.com/latest-fight");
    

    if (res.status === 204) return;

    const data = await res.json();
    if (data.muted) overlayMuted = true;
    triggerFightVisuals(data.intro, data.winner, data.loser);
  } catch (err) {
    console.warn("Polling error:", err);
  }
}

function triggerTest() {
  triggerFightVisuals("StreamerOne enters with glitter boots!", "StreamerOne", "ViewerX");
}

window.Twitch.ext.onAuthorized((auth) => {
  userId = auth.userId;
  document.getElementById("user-info").innerText = `User ID: ${userId}`;
});

window.addEventListener("load", () => {
  console.log("✅ Overlay script loaded");
  setInterval(pollLatestFight, 5000);
});
