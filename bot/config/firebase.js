const admin = require("firebase-admin");
const serviceAccount = require("/etc/secrets/firebaseServiceAccount"); // 👈 loaded from Render secret

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