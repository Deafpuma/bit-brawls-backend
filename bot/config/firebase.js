const admin = require("firebase-admin");

let serviceAccount;

try {
  serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
  console.log("✅ FIREBASE_CONFIG keys:", Object.keys(serviceAccount));

} catch (err) {
  console.error("❌ Failed to parse FIREBASE_CONFIG:", err.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
  

});
