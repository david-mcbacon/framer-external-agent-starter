# Project Thread Instructions

These instructions apply to every thread in this project.

## Required For Every Thread

- Always use the `/framer` skill for every thread.
- Treat all work as related to the Framer project configured in `.env`.
- Make sure you always reference the official framer dev docs when writing overrides or code components. https://framer.com/developers/

## Framer Connection (strict — read this first)

**If the user asks to connect to Framer, or before any Framer work**, follow this exact flow.

### Step 1: Check `.env`

Read `.env` in the repository root and look for `FRAMER_PROJECT_LINK`.

`FRAMER_PROJECT_LINK` must be a **full Framer project URL** copied from the user's browser, for example:

`https://framer.com/projects/My-Site--abc123XYZ-3ZTNf`

### Step 2: If `.env` is missing OR `FRAMER_PROJECT_LINK` is empty — STOP and ask the user

**Do not continue. Do not try to work around this.**

Ask the user exactly this (you may shorten slightly, but keep the meaning):

> I need your Framer project link before I can connect.
>
> In Framer, open your project and copy the URL from your browser address bar. It looks like:
> `https://framer.com/projects/Your-Project-Name--abc123XYZ-3ZTNf`
>
> Paste that link here and I will save it to `.env` and connect.

Then **wait for the user's reply**. Do not run any Framer commands until they provide the link.

**While waiting for the link, you must NOT:**

- Run `npx @framer/agent@latest setup`
- Run `node scripts/connect-framer.js`
- Run `npx @framer/agent@latest session list` or `session new`
- Run `npx @framer/agent@latest project list`
- Create or edit `.env` with a guessed or inferred value
- Copy `.env.example` to `.env` and leave it empty or pre-filled
- Read `.framer/session.json`, terminal history, old skills, or grep the repo to find a project link or ID
- Reuse a session from a previous conversation

**There is no valid fallback.** If you do not have `FRAMER_PROJECT_LINK` from the user in this conversation, you are blocked.

### Step 3: After the user provides the link

1. Create or update `.env` with only:

   ```
   FRAMER_PROJECT_LINK=<the exact URL the user pasted>
   ```

2. Run:

   ```bash
   npx @framer/agent@latest setup
   node scripts/connect-framer.js
   ```

   `connect-framer.js` reuses a session **only if its `projectId` matches**, otherwise creates a new session, and verifies the connection with `scripts/verify-framer-session.exec.js`. **Do not create your own verification scripts.**

3. Use the `sessionId` from the script output (or `.framer/session.json`) with `-s <id>` on every `npx @framer/agent@latest` command.

4. Load the project-scoped skill from `.framer/session.json` (`skill` and `skillPath`).

### If `connect-framer.js` fails with `MISSING_ENV_FILE` or `MISSING_FRAMER_PROJECT_LINK`

Follow Step 2. Ask the user for their project link. **Do not** try to fix it yourself by searching the codebase or prior sessions.

## Scope

- Apply these rules for all tasks in this repository.
- Prefer practical, production-ready solutions.

## Working Style

- Keep responses concise and actionable.
- State assumptions explicitly when requirements are unclear.
- For Framer connection, the rule above overrides "ask only when blocked" — missing `FRAMER_PROJECT_LINK` always means stop and ask.

## Code Changes

- Make the smallest safe change that solves the request.
- Preserve existing project structure and conventions.
- Do not modify unrelated files.

## Handoff

- Summarize what changed and why.
- List exact files touched.
- Mention any follow-up steps if needed.
