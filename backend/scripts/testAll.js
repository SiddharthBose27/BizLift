import { spawnSync } from "node:child_process";

const tests = [
  "test:auth-credentials",
  "test:architecture",
  "test:tenant",
  "test:data",
  "test:ml",
  "test:realtime",
  "test:procurement",
  "test:copilot",
  "test:observability",
];

const failures = [];
for (const script of tests) {
  console.log(`\n=== ${script} ===`);
  const result = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", script], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) failures.push(script);
}

if (failures.length) {
  console.error(`\nRegression suite failed: ${failures.join(", ")}`);
  process.exit(1);
}
console.log(`\nRegression suite passed: ${tests.length}/${tests.length}`);
