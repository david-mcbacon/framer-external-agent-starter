# Framer Agent Setup

Use this once per local project folder to prepare the machine-level Framer agent tooling. This is separate from connecting a specific Framer project in `.env`.

## What this setup does

1. Verifies Node.js is `v24` or newer
2. Runs `npx @framer/agent@latest setup`
3. Saves a local marker file at `.framer/setup.json`

That marker lets the starter know the Framer agent bootstrap was already completed for this folder, so normal project work can skip this step.

## Run it

```bash
npm run framer-setup
```

If setup was already completed, the command exits successfully and reports the existing state instead of running the Framer setup again.

## Node.js requirement

Run:

```bash
node --version
```

Only continue if the major version is `24` or higher.

If Node.js is missing or older than `v24`, install an official Node.js release with major version `24` or higher.

### Install policy

- Use an existing package manager only if it is already installed.
- Do not install Homebrew, winget, Chocolatey, Scoop, `nvm`, `fnm`, or another package manager just for this task.

### Install options

macOS:
- If Homebrew is already installed, use it to install Node.js.
- Otherwise use the official Node.js `.pkg` installer.

Windows:
- If `winget` is already installed, use it to install Node.js.
- Otherwise use the official Node.js `.msi` installer.

Linux:
- If the system package manager can install Node.js `v24` or newer, use it.
- For Debian/Ubuntu or RHEL/Fedora-compatible systems, use the official NodeSource instructions for Node.js `24` or newer.
- Otherwise use the official Node.js standalone Linux binary for the detected architecture.

Official downloads:
- [Node.js latest release directory](https://nodejs.org/download/release/latest/)

## After machine setup

Once `npm run framer-setup` succeeds, connect this folder to one Framer project:

```bash
node scripts/connect-framer.js
```

That project-specific connection is stored separately in `.env` and `.framer/session.json`.
