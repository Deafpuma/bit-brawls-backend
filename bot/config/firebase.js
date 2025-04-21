const admin = require("firebase-admin");
const fs = require("fs");

// 🔥 Load and parse the secret manually
const serviceAccount = JSON.parse(fs.readFileSync("/etc/secrets/firebaseServiceAccount", "utf8"));

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
