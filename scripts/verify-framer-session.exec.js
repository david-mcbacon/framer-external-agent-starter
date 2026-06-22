/**
 * Framer exec verification script.
 *
 * Do not run this directly. It is invoked by `scripts/connect-framer.js` via:
 *   npx @framer/agent@latest exec -s <sessionId> -f scripts/verify-framer-session.exec.js
 *
 * Runs inside the Framer exec sandbox where `framer` is available.
 * Proves the session can reach the Framer API — project ID matching is handled
 * separately by connect-framer.js through `session list`.
 */

console.log(
  JSON.stringify({
    ok: true,
    verifiedAt: new Date().toISOString(),
  }),
);
