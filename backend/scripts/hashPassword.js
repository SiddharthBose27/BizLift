import crypto from "crypto";

function run() {
  const password = "Snap@123";
  const hash = crypto
    .createHash("sha256")
    .update(String(password))
    .digest("hex");
  console.log("Password:", password);
  console.log("Hash:", hash);
}

run();
