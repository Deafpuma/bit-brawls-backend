const admin = require("firebase-admin");

let decoded = null;

try {
  const base64 = process.env.FIREBASE_CONFIG_BASE64;
  if (!base64) throw new Error("FIREBASE_CONFIG_BASE64 is missing");
  const json = Buffer.from(base64, "base64").toString("utf8");
  decoded = JSON.parse(json);
  console.log("✅ Parsed FIREBASE_CONFIG from BASE64");
} catch (err) {
  console.error("❌ Failed to load FIREBASE_CONFIG_BASE64:", err.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(decoded)
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
