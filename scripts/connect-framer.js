#!/usr/bin/env node

/**
 * Ensures a Framer agent session is connected to the project in `.env`.
 * Reuses an existing session only when its projectId matches — never a random session.
 */

const { writeFileSync, mkdirSync, existsSync } = require("fs");
const { spawnSync } = require("child_process");
const { resolve, dirname, join } = require("path");
const { homedir } = require("os");
const {
  FRAMER_PROJECT_LINK_KEY,
  getFramerProjectLink,
  loadEnv,
} = require("./lib/load-env");

const ROOT = resolve(dirname(__filename), "..");
const ENV_PATH = join(ROOT, ".env");
const SESSION_STATE_PATH = join(ROOT, ".framer", "session.json");
const VERIFY_SCRIPT_PATH = join(ROOT, "scripts", "verify-framer-session.exec.js");
const FRAMER_CLI = "npx";
const FRAMER_ARGS_PREFIX = ["@framer/agent@latest"];

const AGENT_ACTION_ASK_USER =
  "Stop. Ask the user for their Framer project URL. Do not guess, infer, or look it up from sessions, terminal history, skills, or other files. Wait for the user reply, write FRAMER_PROJECT_LINK to .env, then run this script again.";

function fail(code, error) {
  const payload = { ok: false, code, error, agentAction: AGENT_ACTION_ASK_USER };
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

function runFramer(args, { stdio = "pipe" } = {}) {
  const result = spawnSync(FRAMER_CLI, [...FRAMER_ARGS_PREFIX, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    stdio,
  });

  if (result.error) {
    throw result.error;
  }

  return {
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
    status: result.status ?? 1,
  };
}

/**
 * Parse project ID from a Framer project URL.
 * Example:
 *   https://framer.com/projects/My-Site--abc123XYZ-3ZTNf -> abc123XYZ
 */
function parseProjectLink(link) {
  const trimmed = link.trim();

  if (!trimmed) {
    fail(
      "MISSING_FRAMER_PROJECT_LINK",
      "FRAMER_PROJECT_LINK in .env is empty.",
    );
  }

  if (/^[A-Za-z0-9]+$/.test(trimmed)) {
    fail(
      "INVALID_FRAMER_PROJECT_LINK",
      "FRAMER_PROJECT_LINK must be a full Framer project URL from the browser, not a project ID.",
    );
  }

  let url;
  try {
    url = new URL(trimmed);
  } catch {
    fail(
      "INVALID_FRAMER_PROJECT_LINK",
      `FRAMER_PROJECT_LINK is not a valid URL: ${trimmed}`,
    );
  }

  const match = url.pathname.match(
    /\/projects\/[^/]*--([A-Za-z0-9]+)(?:-[A-Za-z0-9]+)?\/?$/,
  );

  if (!match) {
    fail(
      "INVALID_FRAMER_PROJECT_LINK",
      `FRAMER_PROJECT_LINK does not look like a Framer project URL: ${trimmed}`,
    );
  }

  return { projectId: match[1], projectUrlOrId: trimmed };
}

function readProjectLink() {
  const env = loadEnv(ENV_PATH);

  if (!env) {
    fail(
      "MISSING_ENV_FILE",
      "Missing .env file. Ask the user for their Framer project URL, then create .env with FRAMER_PROJECT_LINK.",
    );
  }

  const projectLink = getFramerProjectLink(env);

  if (!projectLink) {
    fail(
      "MISSING_FRAMER_PROJECT_LINK",
      "Missing FRAMER_PROJECT_LINK in .env. Ask the user for their Framer project URL, then set FRAMER_PROJECT_LINK in .env.",
    );
  }

  return projectLink;
}

function listSessions() {
  const { stdout, stderr, status } = runFramer(["session", "list"]);

  if (status !== 0) {
    throw new Error(stderr || stdout || "Failed to list Framer sessions.");
  }

  if (!stdout || stdout === "No active sessions") {
    return [];
  }

  return JSON.parse(stdout);
}

function createSession(projectUrlOrId) {
  const { stdout, stderr, status } = runFramer(
    ["session", "new", projectUrlOrId],
    { stdio: "pipe" },
  );

  if (status !== 0) {
    throw new Error(
      stderr || stdout || "Failed to create Framer session. Authorize in the browser if prompted.",
    );
  }

  const sessionId = stdout.split("\n").pop().trim();

  if (!sessionId) {
    throw new Error("session new did not return a session ID.");
  }

  return sessionId;
}

function findSessionForProject(sessions, projectId) {
  return sessions.find((session) => session.projectId === projectId) ?? null;
}

function verifySession(sessionId) {
  if (!existsSync(VERIFY_SCRIPT_PATH)) {
    throw new Error(`Missing verification script: ${VERIFY_SCRIPT_PATH}`);
  }

  const { stdout, stderr, status } = runFramer([
    "exec",
    "-s",
    sessionId,
    "-f",
    VERIFY_SCRIPT_PATH,
  ]);

  if (status !== 0) {
    throw new Error(
      stderr || stdout || `Session ${sessionId} failed verification exec.`,
    );
  }

  try {
    const payload = JSON.parse(stdout);
    if (!payload.ok) {
      throw new Error("Verification exec returned unexpected payload.");
    }
  } catch (error) {
    if (error.message.includes("unexpected payload")) {
      throw error;
    }
    throw new Error(
      `Session ${sessionId} is connected but verification exec returned invalid output: ${stdout}`,
    );
  }
}

function assertSessionProject(sessionId, expectedProjectId) {
  const session = findSessionForProject(listSessions(), expectedProjectId);

  if (!session || session.id !== sessionId) {
    throw new Error(
      `Session ${sessionId} is not connected to project ${expectedProjectId}.`,
    );
  }
}

function getProjectSkillInfo(projectId) {
  const skill = `framer-project-${projectId}`;
  const candidates = [
    join(homedir(), ".agents", "skills", skill, "SKILL.md"),
    join(homedir(), ".claude", "skills", skill, "SKILL.md"),
  ];

  const skillPath = candidates.find((path) => existsSync(path)) ?? candidates[0];

  return { skill, skillPath };
}

function writeSessionState(state) {
  mkdirSync(dirname(SESSION_STATE_PATH), { recursive: true });
  writeFileSync(SESSION_STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function main() {
  const projectLink = readProjectLink();
  const { projectId, projectUrlOrId } = parseProjectLink(projectLink);
  const sessions = listSessions();
  const existing = findSessionForProject(sessions, projectId);

  let sessionId;
  let reusedExistingSession = false;

  if (existing) {
    sessionId = existing.id;
    reusedExistingSession = true;
  } else {
    sessionId = createSession(projectUrlOrId);
  }

  assertSessionProject(sessionId, projectId);
  verifySession(sessionId);

  const { skill, skillPath } = getProjectSkillInfo(projectId);

  const result = {
    ok: true,
    sessionId,
    projectId,
    projectLink: projectUrlOrId,
    projectEnvKey: FRAMER_PROJECT_LINK_KEY,
    reusedExistingSession,
    verified: true,
    skill,
    skillPath,
    execFlag: `-s ${sessionId}`,
  };

  writeSessionState({
    sessionId,
    projectId,
    projectLink: projectUrlOrId,
    projectEnvKey: FRAMER_PROJECT_LINK_KEY,
    skill,
    skillPath,
    verifiedAt: new Date().toISOString(),
    reusedExistingSession,
  });

  console.log(JSON.stringify(result, null, 2));
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    JSON.stringify(
      { ok: false, code: "CONNECT_FAILED", error: message },
      null,
      2,
    ),
  );
  process.exit(1);
}
