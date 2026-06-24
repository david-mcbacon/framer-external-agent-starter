# Framer External Agent Starter

This is a starter project for the Framer External Agent.

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

You can also set it up manually:

```bash
npm run init
```
