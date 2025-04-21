const admin = require("firebase-admin");
const fs = require("fs");

// ✅ PARSE the raw string from Render secret file
const rawKey = fs.readFileSync("/etc/secrets/firebaseServiceAccount", "utf8");
const serviceAccount = JSON.parse(rawKey); // 👈 must parse it here

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
