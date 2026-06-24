# Framer External Agent Starter

This is a starter project for the Framer External Agent.

## Why this starter exists

Framer's external agent flow is powerful, but many people get confused about which project their agent is connected to and when setup needs to happen again.

This starter keeps the model simple:

- one folder on your computer = one Framer project
- one-time external agent setup per folder
- repeated work in that same folder can reuse the same project connection and session
- less confusion for agents
- fewer repeated setup tokens

## Getting Started

This starter separates setup into two layers:

1. One-time machine bootstrap for the external agent
2. Per-folder connection to exactly one Framer project

## Best First Command

For a new folder, the best one-liner is:

```bash
npm run init
```

That command:

- runs the one-time Framer agent setup for this folder
- asks for or uses `FRAMER_PROJECT_LINK`
- connects the folder to exactly one Framer project

After that first run, future work in the same folder should usually skip `npm run init` and reuse the existing setup.

## Copy This To Your Agent

First time in this folder:

```text
Please set up the external Framer agent for me in this folder. If you need my Framer project link, ask me for it.
```

Later in this same folder:

```text
Use the existing Framer setup in this folder and reconnect to my project. Reuse the current session if possible.
```

### 1. One-time setup in this folder

Run:

```bash
npm run framer-setup
```

This:

- checks that Node.js is `v24` or newer
- runs `npx @framer/agent@latest setup`
- stores a local marker in `.framer/setup.json`

If Node is missing or too old, follow [docs/framer-agent-setup.md](docs/framer-agent-setup.md).

### 2. Connect the folder to one Framer project

Ask your agent to connect to Framer. If `.env` is not set up, it will follow [docs/framer-connection.md](docs/framer-connection.md) and ask for your project link.

In Framer, open your project and copy the URL from your browser. It looks like:

`https://framer.com/projects/Your-Project-Name--abc123XYZ-3ZTNf`

Paste that link to your agent. It will save it to `.env` and connect.

## Agent-first workflow

Most Framer users will probably let an external agent do the setup. That is a good fit for this starter.

For the first run in a new folder, say something like:

```text
Please set up the external Framer agent for me in this folder. If you need my Framer project link, ask me for it.
```

For later work in the same folder, use a shorter message to save tokens:

```text
Use the existing Framer setup in this folder and reconnect to my project. Reuse the current session if possible.
```

The idea is simple:

- first run: initialize the machine setup and project connection
- later runs: skip repeating setup context and just reconnect or reuse the existing session

Behind the scenes, the agent should handle the terminal commands for you.

## Helpful Commands

```bash
npm run init
npm run framer-status
npm run reset-local
```

- `npm run init` prepares the folder and connects it to one Framer project
- `npm run framer-status` shows whether this folder is ready and what to do next
- `npm run reset-local` clears local setup and connection files so you can test the first-run flow again

## Manual Setup

Quick path:

```bash
npm run init
```

Step by step:

```bash
npm run framer-setup
cp .env.example .env
# Edit .env and set FRAMER_PROJECT_LINK to your Framer project URL
node scripts/connect-framer.js
```

## Troubleshooting

### Node.js is too old

Run:

```bash
node --version
```

If the major version is lower than `24`, follow [docs/framer-agent-setup.md](docs/framer-agent-setup.md).

### The agent says setup is missing

Run:

```bash
npm run framer-setup
```

This writes `.framer/setup.json` for this folder after the Framer setup completes.

### The agent asks for my project link

That usually means `.env` is missing or `FRAMER_PROJECT_LINK` is empty.

Open your Framer project and copy the full project URL. It should look like:

`https://framer.com/projects/Your-Project-Name--abc123XYZ-3ZTNf`

### The project URL is wrong

Use the full Framer project URL from the browser, not only the project ID.

### The session expired or does not reconnect

Run:

```bash
npm run framer-status
node scripts/connect-framer.js
```

The status command will tell you whether the folder is missing setup, missing a project link, or just needs a new session.
