const fs = require("fs");
const key = fs.readFileSync("./firebaseServiceAccount.json", "utf8");
console.log(Buffer.from(key).toString("base64"));
