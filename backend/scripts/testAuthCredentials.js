import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../services/authService.js";

const password = "snapeats123";
const expectedHash = "fb6fc7bf583b5c01537e4d119d303e0581cc4983eab9ba6ee0a34f0aa1d9f9fd";

assert.equal(hashPassword(password), expectedHash);
assert.equal(verifyPassword(password, expectedHash), true);
assert.equal(verifyPassword("wrong-password", expectedHash), false);

console.log(JSON.stringify({
  auth: "passed",
  email: "snapeats@techparkone.com",
  password: "snapeats123",
}));
