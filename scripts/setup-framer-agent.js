#!/usr/bin/env node

const { mkdirSync, existsSync, readFileSync, writeFileSync } = require("fs");
const { spawnSync } = require("child_process");
const { dirname, join, resolve } = require("path");

const ROOT = resolve(dirname(__filename), "..");
const STATE_PATH = join(ROOT, ".framer", "setup.json");
const SETUP_COMMAND = ["@framer/agent@latest", "setup"];
const MIN_NODE_MAJOR = 24;

function getMajorNodeVersion(version) {
  const match = /^v?(\d+)/.exec(version);
  return match ? Number(match[1]) : null;
}

function fail(code, error, extra = {}) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        code,
        error,
        ...extra,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

function readState() {
  if (!existsSync(STATE_PATH)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf8"));
  } catch (error) {
    fail(
      "INVALID_SETUP_STATE",
      `Failed to parse ${STATE_PATH}: ${error.message}`,
    );
  }
}

function writeState(state) {
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function isStateReusable(state, currentNodeVersion) {
  if (!state) {
    return false;
  }

  return (
    state.ok === true &&
    state.schemaVersion === 1 &&
    typeof state.completedAt === "string" &&
    state.nodeVersion === currentNodeVersion
  );
}

function parseArgs(argv) {
  const args = new Set(argv.slice(2));

  return {
    check: args.has("--check"),
    force: args.has("--force"),
  };
}

function printNodeUpgradeHelp(currentVersion) {
  const platform = process.platform;

  const help = {
    darwin: [
      "Install Node.js v24 or newer.",
      "If Homebrew is already installed, use it.",
      "Otherwise use the official Node.js .pkg installer from https://nodejs.org/download/release/latest/.",
    ],
    win32: [
      "Install Node.js v24 or newer.",
      "If winget is already installed, use it.",
      "Otherwise use the official Node.js .msi installer from https://nodejs.org/download/release/latest/.",
    ],
    linux: [
      "Install Node.js v24 or newer.",
      "Use your existing system package manager if it can install Node 24+.",
      "For Debian/Ubuntu or RHEL/Fedora systems, prefer the official NodeSource instructions.",
      "Otherwise use the official standalone Linux binary from https://nodejs.org/download/release/latest/.",
    ],
  };

  fail(
    "NODE_VERSION_UNSUPPORTED",
    `Node.js ${currentVersion} is too old. Node.js v${MIN_NODE_MAJOR}+ is required before running Framer agent setup.`,
    {
      nextSteps: help[platform] ?? [
        "Install Node.js v24 or newer from https://nodejs.org/download/release/latest/.",
      ],
      docs: "/docs/framer-agent-setup.md",
    },
  );
}

function runSetup() {
  const result = spawnSync("npx", SETUP_COMMAND, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.error) {
    throw result.error;
  }

  if ((result.status ?? 1) !== 0) {
    const message = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
    fail(
      "FRAMER_SETUP_FAILED",
      message || "Failed to run npx @framer/agent@latest setup.",
      {
        command: `npx ${SETUP_COMMAND.join(" ")}`,
      },
    );
  }

  return {
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
}

function main() {
  const { check, force } = parseArgs(process.argv);
  const nodeVersion = process.version;
  const nodeMajor = getMajorNodeVersion(nodeVersion);

  if (!nodeMajor || nodeMajor < MIN_NODE_MAJOR) {
    printNodeUpgradeHelp(nodeVersion);
  }

  const existingState = readState();

  if (!force && isStateReusable(existingState, nodeVersion)) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          alreadySetup: true,
          statePath: STATE_PATH,
          nodeVersion,
          completedAt: existingState.completedAt,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (check) {
    fail(
      "FRAMER_SETUP_REQUIRED",
      "Framer agent setup has not been completed in this folder yet.",
      {
        command: "npm run framer-setup",
        statePath: STATE_PATH,
      },
    );
  }

  const setupResult = runSetup();
  const state = {
    schemaVersion: 1,
    ok: true,
    command: `npx ${SETUP_COMMAND.join(" ")}`,
    completedAt: new Date().toISOString(),
    nodeVersion,
    platform: process.platform,
    arch: process.arch,
    stdout: setupResult.stdout,
  };

  writeState(state);

  console.log(
    JSON.stringify(
      {
        ok: true,
        alreadySetup: false,
        statePath: STATE_PATH,
        nodeVersion,
        completedAt: state.completedAt,
        stdout: setupResult.stdout,
      },
      null,
      2,
    ),
  );
}

main();
