# Framer Connection

Read this file when `.env` is missing, `FRAMER_PROJECT_LINK` is empty, or `node scripts/connect-framer.js` fails with `MISSING_ENV_FILE`, `MISSING_FRAMER_PROJECT_LINK`, or `INVALID_FRAMER_PROJECT_LINK`.

## What you need

`FRAMER_PROJECT_LINK` must be a **full Framer project URL** from the user's browser, for example:

`https://framer.com/projects/My-Site--abc123XYZ-3ZTNf`

Do **not** use a raw project ID.

## If `.env` is missing or `FRAMER_PROJECT_LINK` is empty — STOP and ask the user

**Do not continue. Do not try to work around this.**

Ask the user (you may shorten slightly, but keep the meaning):

> I need your Framer project link before I can connect.
>
> - Browser: copy the address bar when the project is open.
> - App: right-click the project tab, then choose "Copy Project Link".
>   It looks like:
>   `https://framer.com/projects/Your-Project-Name--abc123XYZ-3ZTNf`
>
> Paste that link here and I will save it to `.env` and connect.

Then **wait for the user's reply**. Do not run any Framer commands until they provide the link.

### While waiting, you must NOT

- Run `node scripts/connect-framer.js`
- Run `npx @framer/agent@latest session list` or `session new`
- Run `npx @framer/agent@latest project list`
- Create or edit `.env` with a guessed or inferred value
- Copy `.env.example` to `.env` and leave it empty or pre-filled
- Read `.framer/session.json`, terminal history, old skills, or grep the repo to find a project link
- Reuse a session from a previous conversation

**There is no valid fallback.** If you do not have `FRAMER_PROJECT_LINK` from the user in this conversation, you are blocked.

## After the user provides the link

1. Create or update `.env` with only:

   ```
   FRAMER_PROJECT_LINK=<the exact URL the user pasted>
   ```

2. Connect:

   ```bash
   node scripts/connect-framer.js
   ```

3. Use the `sessionId` from the script output (or `.framer/session.json`) with `-s <id>` on every `npx @framer/agent@latest` command.

4. Load the project-scoped skill from `.framer/session.json` (`skill` and `skillPath`).

## Connection details

- `connect-framer.js` always lists active sessions first and compares each session's `projectId` to the project parsed from `.env`.
- If a session's `projectId` matches and verifies, that session is reused — you are already connected to the right project.
- If no session matches, or the matched session is expired, a new session is created for `FRAMER_PROJECT_LINK`.
- Verification runs via `scripts/verify-framer-session.exec.js`. **Do not create your own verification scripts.**
- If `connect-framer.js` prints `agentAction` in its error output, follow that instruction — do not search the codebase or prior sessions for a project link.

## Reference

- Official Framer dev docs for overrides and code components: https://framer.com/developers/
