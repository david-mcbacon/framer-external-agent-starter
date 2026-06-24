#!/usr/bin/env node

const { existsSync, rmSync } = require("fs");
const { resolve, dirname, join } = require("path");

const ROOT = resolve(dirname(__filename), "..");
const TARGETS = [
  join(ROOT, ".framer", "setup.json"),
  join(ROOT, ".framer", "session.json"),
  join(ROOT, ".env"),
];

function main() {
  const removed = [];
  const skipped = [];

  for (const filePath of TARGETS) {
    if (existsSync(filePath)) {
      rmSync(filePath, { force: true });
      removed.push(filePath);
      continue;
    }

    skipped.push(filePath);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        removed,
        skipped,
        nextStep:
          "Local Framer state was reset for this folder. Run `npm run init` to test first-time setup again.",
      },
      null,
      2,
    ),
  );
}

main();
