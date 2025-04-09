let userId = null;
let viewerName = null;
let fightInProgress = false;
let soundIsPlaying = false;
let overlayMuted = false;

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
  "🚫 {loser} just got banned from life."
];

function playSound(name, volume = 1.0) {
  if (soundIsPlaying || overlayMuted) return;
  const audio = new Audio(`sounds/${name}.mp3`);
  audio.volume = volume;
  audio.play();
  soundIsPlaying = true;
  audio.onended = () => soundIsPlaying = false;
}

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
  const trashTalk = [
    `${loser} got folded like a lawn chair by ${winner}!`,
    `${winner} drop-kicked ${loser} into the void.`,
    `RIP ${loser} — ${winner} said \"sit down.\"`,
    `${loser} got hit so weak it felt like a baby slap!`,
    `${winner} just KO’d ${loser} with a flying elbow!`
  ];
  const line = trashTalk[Math.floor(Math.random() * trashTalk.length)];
  log.innerHTML = `🥊 ${intro}<br>🏆 <strong>${winner}</strong> wins the fight!<br>${line}<br>${koLine}`;

  playSound("StartingBell", 0.8);
  setTimeout(() => playSound("swoosh-1", 0.8), 800);
  setTimeout(() => playSound("5punchSound", 0.9), 1300);
  setTimeout(() => playSound("swoosh-2", 0.7), 1700);

  const pow = document.createElement("div");
  pow.innerHTML = `<div class='pow-text'>💥 POW!</div>`;
  document.getElementById("container").appendChild(pow);
  setTimeout(() => pow.remove(), 1500);

  if (line.includes("baby")) {
    setTimeout(() => playSound("baby-laughing", 0.8), 1800);
    setTimeout(() => playSound("SillyWin", 0.8), 2500);
  } else {
    const koSounds = ["KO_GameSound", "KO_boring", "QuickLoudCheer", "SADAH"];
    const chosen = koSounds[Math.floor(Math.random() * koSounds.length)];
    setTimeout(() => playSound(chosen, 0.9), 2200);
  }

  setTimeout(() => {
    const gifs = ["BitPOW.gif", "BitBoom.gif", "KO_Gif.gif"];
    showGifOverlay(gifs[Math.floor(Math.random() * gifs.length)], 2500);
  }, 1800);

  setTimeout(() => fightInProgress = false, 3000);
}

async function pollLatestFight() {
  try {
    const res = await fetch("https://your-render-url.onrender.com/latest-fight");
    if (!res.ok) return;
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

