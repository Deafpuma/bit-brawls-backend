const admin = require("firebase-admin");
const fs = require("fs");

let serviceAccount;
try {
  const raw = fs.readFileSync("/etc/secrets/FIREBASE_CONFIG_BASE64", "utf8");
  const decoded = Buffer.from(raw, "base64").toString("utf8");
  serviceAccount = JSON.parse(decoded);
  console.log("✅ FIREBASE_CONFIG loaded. Keys:", Object.keys(serviceAccount));
} catch (err) {
  console.error("❌ Failed to load FIREBASE_CONFIG:", err.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function saveBroadcasterToken(login, config) {
  await db.collection("broadcasters").doc(login).set(config, { merge: true });
}

async function getBroadcasterToken(login) {
  const doc = await db.collection("broadcasters").doc(login).get();
  return doc.exists ? doc.data() : null;
}

module.exports = {
  db,
  saveBroadcasterToken,
  getBroadcasterToken
};
