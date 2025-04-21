const fs = require("fs");

const json = fs.readFileSync("C:/Users/Admin/Downloads/firebaseServiceAccount.json", "utf8");
const encoded = Buffer.from(json).toString("base64");

fs.writeFileSync("./firebase-key-base64.txt", encoded);
console.log("✅ Saved as firebase-key-base64.txt");


"C:\Users\Admin\Downloads"