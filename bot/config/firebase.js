const admin = require("firebase-admin");
const fs = require("fs");
const path = "/etc/secrets/firebaseServiceAccount";

// ✅ Read the raw file and parse it as JSON
let serviceAccount;

try {
  const rawKey = fs.readFileSync(path, "utf8");
  serviceAccount = JSON.parse(rawKey);
} catch (err) {
  console.error("❌ Failed to parse Firebase service account key:", err.message);
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
