#!/usr/bin/env node

const { spawnSync } = require("child_process");
const { resolve, dirname } = require("path");

const ROOT = resolve(dirname(__filename), "..");

function runNodeScript(scriptPath, args = []) {
  const result = spawnSync("node", [scriptPath, ...args], {
    cwd: ROOT,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main() {
  const args = process.argv.slice(2);

  console.log("Framer starter init\n");
  console.log("Step 1 of 2: prepare the external agent in this folder.");
  runNodeScript("scripts/setup-framer-agent.js");

  console.log("\nStep 2 of 2: connect this folder to one Framer project.");
  runNodeScript("scripts/connect-framer.js", args);

  console.log("\nInit complete.");
  console.log(
    "Next time in this same folder, you can usually skip `npm run init` and ask your agent to use the existing setup and reconnect to the project.",
  );
}

main();
