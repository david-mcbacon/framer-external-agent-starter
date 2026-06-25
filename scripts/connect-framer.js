#!/usr/bin/env node

/**
 * Ensures a Framer agent session is connected to the project in `.env`.
 *
 * Flow:
 * 1. Read FRAMER_PROJECT_LINK from .env and parse the expected projectId
 * 2. List active sessions and look for one with a matching projectId
 * 3. If a match exists and verifies, reuse it — already connected
 * 4. Otherwise create a new session for the project link
 */

const { readFileSync, writeFileSync, mkdirSync, existsSync } = require("fs");
const { spawnSync } = require("child_process");
const { resolve, dirname, join } = require("path");
const { homedir } = require("os");
const readline = require("readline");
const {
  FRAMER_PROJECT_LINK_KEY,
  getFramerProjectLink,
  loadEnv,
  setFramerProjectLink,
} = require("./lib/load-env");

const ROOT = resolve(dirname(__filename), "..");
const ENV_PATH = join(ROOT, ".env");
const SETUP_STATE_PATH = join(ROOT, ".framer", "setup.json");
const SESSION_STATE_PATH = join(ROOT, ".framer", "session.json");
const VERIFY_SCRIPT_PATH = join(
  ROOT,
  "scripts",
  "verify-framer-session.exec.js",
);
const FRAMER_CLI = "npx";
const FRAMER_ARGS_PREFIX = ["@framer/agent@latest"];

const AGENT_ACTION_ASK_USER =
  "Read docs/framer-connection.md and follow it. Stop. Ask the user for their Framer project URL. Do not guess, infer, or look it up from sessions, terminal history, skills, or other files. Wait for the user reply, write FRAMER_PROJECT_LINK to .env, then run this script again.";

const green = (text) => `\x1b[32m${text}\x1b[0m`;
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;

function logConnected(projectId) {
  console.log(green(`✅ Connected to project ${projectId}`));
}

function logNotConnected() {
  console.error(red("❌ Project not connected"));
}

function logConnecting() {
  console.log(
    yellow("Connecting your project to the Framer agent. Please wait..."),
  );
}

function fail(code, error, extra = {}) {
  logNotConnected();
  const payload = {
    ok: false,
    code,
    error,
    agentAction: AGENT_ACTION_ASK_USER,
    ...extra,
  };
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

function readSetupState() {
  if (!existsSync(SETUP_STATE_PATH)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(SETUP_STATE_PATH, "utf8"));
  } catch {
    return null;
  }
}

function assertAgentSetup() {
  const state = readSetupState();

  if (
    state &&
    state.ok === true &&
    state.schemaVersion === 1 &&
    typeof state.completedAt === "string"
  ) {
    return;
  }

  fail(
    "FRAMER_AGENT_SETUP_REQUIRED",
    "Framer agent setup has not been completed for this folder. Run `npm run framer-setup` once before connecting a project.",
    {
      agentAction:
        "Run `npm run framer-setup` once for this folder, then rerun `node scripts/connect-framer.js`.",
    },
  );
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

function parseJsonOutput(output, label) {
  const cleaned = output.replace(ANSI_PATTERN, "").trim();

  if (!cleaned) {
    throw new Error(`${label} returned empty output.`);
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonStart = cleaned.search(/[\[{]/);

    if (jsonStart === -1) {
      throw new Error(`${label} returned non-JSON output: ${cleaned}`);
    }

    try {
      return JSON.parse(cleaned.slice(jsonStart));
    } catch (error) {
      throw new Error(
        `${label} returned invalid JSON: ${
          error instanceof Error ? error.message : String(error)
        }\nOutput: ${cleaned}`,
      );
    }
  }
}

/**
 * Parse project ID from a Framer project URL.
 * Example:
 *   https://framer.com/projects/My-Site--abc123XYZ-3ZTNf -> abc123XYZ
 */
function validateProjectLink(link) {
  const trimmed = link.trim();

  if (!trimmed) {
    return { ok: false, error: "URL cannot be empty." };
  }

  if (/^[A-Za-z0-9]+$/.test(trimmed)) {
    return {
      ok: false,
      error:
        "Use a full Framer project URL from the browser, not a project ID.",
    };
  }

  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: `Not a valid URL: ${trimmed}` };
  }

  const match = url.pathname.match(
    /\/projects\/[^/]*--([A-Za-z0-9]+)(?:-[A-Za-z0-9]+)?\/?$/,
  );

  if (!match) {
    return {
      ok: false,
      error: `Does not look like a Framer project URL: ${trimmed}`,
    };
  }

  return {
    ok: true,
    projectId: match[1],
    projectUrlOrId: trimmed,
  };
}

function parseProjectLink(link) {
  const result = validateProjectLink(link);

  if (!result.ok) {
    fail("INVALID_FRAMER_PROJECT_LINK", result.error);
  }

  return {
    projectId: result.projectId,
    projectUrlOrId: result.projectUrlOrId,
  };
}

function isInteractiveTerminal() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function printCliHelp() {
  console.log(`Usage: node scripts/connect-framer.js [options] [project-url]

Connect this repo to a Framer project.

Options:
  --link, -l <url>       Framer project URL
  --project-link <url>   Same as --link
  --help, -h             Show this help

If no URL is passed and .env is missing FRAMER_PROJECT_LINK, an interactive
terminal prompts for the URL. Non-interactive runs (for example agents) still
fail with instructions to ask the user.

Examples:
  npm run framer-connect
  npm run framer-connect -- --link https://framer.com/projects/My-Site--abc123XYZ-3ZTNf
  node scripts/connect-framer.js https://framer.com/projects/My-Site--abc123XYZ-3ZTNf`);
}

function parseCliArgs(argv) {
  const args = argv.slice(2);
  let link = null;
  let help = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }

    if (arg === "--link" || arg === "-l" || arg === "--project-link") {
      link = args[index + 1];

      if (!link || link.startsWith("-")) {
        console.error(`Missing value for ${arg}`);
        process.exit(1);
      }

      index += 1;
      continue;
    }

    if (arg.startsWith("-")) {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    }

    if (!link) {
      link = arg;
    }
  }

  return { link, help };
}

function promptForProjectLink() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (text) =>
    new Promise((resolveQuestion) => {
      rl.question(text, resolveQuestion);
    });

  console.log("\nI need your Framer project link before I can connect.\n");
  console.log(
    "In Framer, open your project and copy the URL from your browser. It looks like:",
  );
  console.log(
    "https://framer.com/projects/Your-Project-Name--abc123XYZ-3ZTNf\n",
  );

  return new Promise((resolvePrompt) => {
    const ask = async () => {
      const answer = (await question("Framer project URL: ")).trim();

      if (!answer) {
        console.log("Please enter a URL.\n");
        ask();
        return;
      }

      const result = validateProjectLink(answer);

      if (!result.ok) {
        console.log(`\n${result.error}\n`);
        ask();
        return;
      }

      rl.close();
      logConnecting();
      resolvePrompt(result.projectUrlOrId);
    };

    ask();
  });
}

async function resolveProjectLink() {
  const { link: cliLink, help } = parseCliArgs(process.argv);

  if (help) {
    printCliHelp();
    process.exit(0);
  }

  if (cliLink) {
    const validated = validateProjectLink(cliLink);

    if (!validated.ok) {
      fail("INVALID_FRAMER_PROJECT_LINK", validated.error);
    }

    setFramerProjectLink(ENV_PATH, validated.projectUrlOrId);
    logConnecting();
    return validated.projectUrlOrId;
  }

  const env = loadEnv(ENV_PATH);
  const envLink = getFramerProjectLink(env);

  if (envLink) {
    return envLink;
  }

  if (isInteractiveTerminal()) {
    const promptedLink = await promptForProjectLink();
    setFramerProjectLink(ENV_PATH, promptedLink);
    return promptedLink;
  }

  if (!env) {
    fail(
      "MISSING_ENV_FILE",
      "Missing .env file. Ask the user for their Framer project URL, then create .env with FRAMER_PROJECT_LINK.",
    );
  }

  fail(
    "MISSING_FRAMER_PROJECT_LINK",
    "Missing FRAMER_PROJECT_LINK in .env. Ask the user for their Framer project URL, then set FRAMER_PROJECT_LINK in .env.",
  );
}

function listActiveSessions() {
  const { stdout, stderr, status } = runFramer(["session", "list"]);

  if (status !== 0) {
    throw new Error(stderr || stdout || "Failed to list Framer sessions.");
  }

  const cleanedStdout = stdout.replace(ANSI_PATTERN, "").trim();
  const lastLine = cleanedStdout.split(/\r?\n/).pop();

  if (!cleanedStdout || lastLine === "No active sessions") {
    return [];
  }

  const sessions = parseJsonOutput(cleanedStdout, "Framer session list");

  if (!Array.isArray(sessions)) {
    throw new Error("Framer session list returned an unexpected payload.");
  }

  return sessions;
}

function findSessionForProjectId(sessions, projectId) {
  return sessions.find((session) => session.projectId === projectId) ?? null;
}

function createSession(projectUrlOrId) {
  const { stdout, stderr, status } = runFramer(
    ["session", "new", projectUrlOrId],
    { stdio: "pipe" },
  );

  if (status !== 0) {
    throw new Error(
      stderr ||
        stdout ||
        "Failed to create Framer session. Authorize in the browser if prompted.",
    );
  }

  const sessionId = stdout.split("\n").pop().trim();

  if (!sessionId) {
    throw new Error("session new did not return a session ID.");
  }

  return sessionId;
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
    const payload = parseJsonOutput(stdout, `Session ${sessionId} verification`);
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

function isSessionVerified(sessionId) {
  try {
    verifySession(sessionId);
    return true;
  } catch {
    return false;
  }
}

function assertSessionMatchesProject(sessions, sessionId, expectedProjectId) {
  const session = findSessionForProjectId(sessions, expectedProjectId);

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

  const skillPath =
    candidates.find((path) => existsSync(path)) ?? candidates[0];

  return { skill, skillPath };
}

function writeSessionState(state) {
  mkdirSync(dirname(SESSION_STATE_PATH), { recursive: true });
  writeFileSync(
    SESSION_STATE_PATH,
    `${JSON.stringify(state, null, 2)}\n`,
    "utf8",
  );
}

/**
 * Resolve the session for the configured project.
 * Always checks active sessions first; only creates a new session when needed.
 */
function resolveSession({ projectId, projectUrlOrId }) {
  const activeSessions = listActiveSessions();
  const matchingSession = findSessionForProjectId(activeSessions, projectId);

  if (matchingSession) {
    const sessionId = matchingSession.id;

    if (isSessionVerified(sessionId)) {
      return {
        sessionId,
        connectionStatus: "existing",
        reusedExistingSession: true,
        activeSessionsChecked: activeSessions.length,
        matchedByProjectId: true,
      };
    }
  }

  const sessionId = createSession(projectUrlOrId);
  verifySession(sessionId);

  const sessionsAfterCreate = listActiveSessions();
  assertSessionMatchesProject(sessionsAfterCreate, sessionId, projectId);

  return {
    sessionId,
    connectionStatus: "created",
    reusedExistingSession: false,
    activeSessionsChecked: activeSessions.length,
    matchedByProjectId: false,
  };
}

async function main() {
  assertAgentSetup();

  const projectLink = await resolveProjectLink();
  const { projectId, projectUrlOrId } = parseProjectLink(projectLink);

  const {
    sessionId,
    connectionStatus,
    reusedExistingSession,
    activeSessionsChecked,
    matchedByProjectId,
  } = resolveSession({ projectId, projectUrlOrId });

  const { skill, skillPath } = getProjectSkillInfo(projectId);

  const result = {
    ok: true,
    connected: true,
    connectionStatus,
    reusedExistingSession,
    matchedByProjectId,
    activeSessionsChecked,
    sessionId,
    projectId,
    projectLink: projectUrlOrId,
    projectEnvKey: FRAMER_PROJECT_LINK_KEY,
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
    connectionStatus,
    skill,
    skillPath,
    verifiedAt: new Date().toISOString(),
    reusedExistingSession,
    matchedByProjectId,
  });

  logConnected(projectId);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  logNotConnected();
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    JSON.stringify(
      { ok: false, code: "CONNECT_FAILED", error: message },
      null,
      2,
    ),
  );
  process.exit(1);
});
