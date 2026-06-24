#!/usr/bin/env node

const { existsSync, readFileSync } = require("fs");
const { spawnSync } = require("child_process");
const { resolve, dirname, join } = require("path");
const { loadEnv, getFramerProjectLink } = require("./lib/load-env");

const ROOT = resolve(dirname(__filename), "..");
const ENV_PATH = join(ROOT, ".env");
const SETUP_STATE_PATH = join(ROOT, ".framer", "setup.json");
const SESSION_STATE_PATH = join(ROOT, ".framer", "session.json");
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const red = (text) => `\x1b[31m${text}\x1b[0m`;

function getMajorNodeVersion(version) {
  const match = /^v?(\d+)/.exec(version);
  return match ? Number(match[1]) : null;
}

function readJson(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    return {
      invalid: true,
      error: error.message,
      filePath,
    };
  }
}

function runFramer(args) {
  const result = spawnSync("npx", ["@framer/agent@latest", ...args], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.error) {
    return {
      ok: false,
      error: result.error.message,
    };
  }

  if ((result.status ?? 1) !== 0) {
    return {
      ok: false,
      error: (result.stderr || result.stdout || "Unknown Framer CLI error.").trim(),
    };
  }

  return {
    ok: true,
    stdout: (result.stdout || "").trim(),
  };
}

function getSessionSummary() {
  const savedSession = readJson(SESSION_STATE_PATH);
  const listed = runFramer(["session", "list"]);

  if (!listed.ok) {
    return {
      file: savedSession,
      cli: {
        ok: false,
        error: listed.error,
      },
      activeSessionMatchesSaved: false,
    };
  }

  const sessions =
    !listed.stdout || listed.stdout === "No active sessions"
      ? []
      : JSON.parse(listed.stdout);

  const savedSessionId = savedSession?.sessionId ?? null;
  const activeMatch = savedSessionId
    ? sessions.find((session) => session.id === savedSessionId) ?? null
    : null;

  return {
    file: savedSession,
    cli: {
      ok: true,
      activeSessions: sessions,
      activeCount: sessions.length,
    },
    activeSessionMatchesSaved: Boolean(activeMatch),
  };
}

function getNextStep({ nodeMajor, setupState, projectLink, sessionSummary }) {
  if (!nodeMajor || nodeMajor < 24) {
    return "Install Node.js v24 or newer, then run `npm run framer-setup`.";
  }

  if (!setupState || setupState.invalid || setupState.ok !== true) {
    return "Run `npm run framer-setup`.";
  }

  if (!projectLink) {
    return "Add `FRAMER_PROJECT_LINK` to `.env`, or ask your agent to connect this folder to your Framer project.";
  }

  if (!sessionSummary.file?.sessionId) {
    return "Run `node scripts/connect-framer.js` or ask your agent to reconnect this folder to the project.";
  }

  if (!sessionSummary.activeSessionMatchesSaved) {
    return "Run `node scripts/connect-framer.js` to create or reuse a valid session for this project.";
  }

  return "This folder looks ready. Ask your agent to reuse the existing Framer setup and reconnect to the project.";
}

function getHumanSummary(payload) {
  const lines = [];
  const { checks, nextStep } = payload;

  lines.push("Framer status summary");
  lines.push(
    `- Node.js: ${checks.node.supported ? "ready" : "needs upgrade"} (${checks.node.version})`,
  );
  lines.push(
    `- Agent setup: ${checks.setup.configured ? "ready" : "missing"}`,
  );
  lines.push(
    `- Project link: ${checks.env.hasProjectLink ? "configured" : "missing"}`,
  );
  lines.push(
    `- Session: ${checks.session.activeSessionMatchesSaved ? "ready" : "needs reconnect"}`,
  );
  lines.push(`- Next step: ${nextStep}`);

  return lines.join("\n");
}

function isHealthy(payload) {
  const { checks } = payload;

  return (
    checks.node.supported &&
    checks.setup.configured &&
    checks.env.fileExists &&
    checks.env.hasProjectLink &&
    checks.session.activeSessionMatchesSaved
  );
}

function main() {
  const env = loadEnv(ENV_PATH);
  const projectLink = getFramerProjectLink(env);
  const setupState = readJson(SETUP_STATE_PATH);
  const sessionSummary = getSessionSummary();
  const nodeVersion = process.version;
  const nodeMajor = getMajorNodeVersion(nodeVersion);

  const payload = {
    ok: true,
    folder: ROOT,
    checks: {
      node: {
        version: nodeVersion,
        major: nodeMajor,
        supported: Boolean(nodeMajor && nodeMajor >= 24),
      },
      setup: {
        configured: Boolean(
          setupState &&
            !setupState.invalid &&
            setupState.ok === true &&
            typeof setupState.completedAt === "string",
        ),
        statePath: SETUP_STATE_PATH,
        state: setupState,
      },
      env: {
        fileExists: existsSync(ENV_PATH),
        hasProjectLink: Boolean(projectLink),
        projectLink: projectLink ?? null,
      },
      session: {
        statePath: SESSION_STATE_PATH,
        saved: sessionSummary.file,
        cli: sessionSummary.cli,
        activeSessionMatchesSaved: sessionSummary.activeSessionMatchesSaved,
      },
    },
  };

  payload.nextStep = getNextStep({
    nodeMajor,
    setupState,
    projectLink,
    sessionSummary,
  });

  console.log(JSON.stringify(payload, null, 2));
  console.log("");
  const summary = getHumanSummary(payload);
  console.log(isHealthy(payload) ? green(summary) : red(summary));
}

main();
