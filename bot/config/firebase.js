const admin = require("firebase-admin");

let serviceAccount;
if (process.env.FIREBASE_CONFIG) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
    console.log("✅ FIREBASE_CONFIG loaded. Keys:", Object.keys(serviceAccount));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (err) {
    console.error("❌ Failed to parse FIREBASE_CONFIG:", err.message);
    process.exit(1);
  }
} else {
  console.warn("⚠️ FIREBASE_CONFIG not found. Trying GOOGLE_APPLICATION_CREDENTIALS path...");
  admin.initializeApp(); // Uses GOOGLE_APPLICATION_CREDENTIALS env path
}


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
