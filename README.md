# Framer External Agent Starter

This is a starter project for the Framer External Agent.

## Getting Started

1. Clone the repository
2. Ask your agent to connect to Framer — if `.env` is not set up, it will follow `docs/framer-connection.md` and ask for your project link
3. In Framer, open your project and copy the URL from your browser. It looks like:

   `https://framer.com/projects/Your-Project-Name--abc123XYZ-3ZTNf`

4. Paste that link to your agent. It will save it to `.env` and connect.

You can also set it up manually:

```bash
cp .env.example .env
# Edit .env and set FRAMER_PROJECT_LINK to your Framer project URL
npx @framer/agent@latest setup
node scripts/connect-framer.js
```
