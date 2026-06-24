# Project Thread Instructions

These instructions apply to every thread in this project.

## Required For Every Thread

- Always use the `/framer` skill for every thread.
- Treat all work as related to the Framer project configured in `.env`.

## Framer Connection

Before any Framer work, read `.env` and check that `FRAMER_PROJECT_LINK` is set.

- **If missing or empty:** read `docs/framer-connection.md` and follow it exactly. Stop and ask the user for their project link — do not run Framer CLI commands or guess the link.
- **If set:** run `node scripts/connect-framer.js`. Use `-s <sessionId>` from the output or `.framer/session.json` for all Framer CLI commands, and load the project skill from `.framer/session.json`.

## Scope

- Apply these rules for all tasks in this repository.
- Prefer practical, production-ready solutions.

## Working Style

- Keep responses concise and actionable.
- State assumptions explicitly when requirements are unclear.
- Ask one focused clarification only when truly blocked.

## Code Changes

- Make the smallest safe change that solves the request.
- Preserve existing project structure and conventions.
- Do not modify unrelated files.

## Handoff

- Summarize what changed and why.
- List exact files touched.
- Mention any follow-up steps if needed.
