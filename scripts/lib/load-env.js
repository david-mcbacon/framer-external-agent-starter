const { readFileSync, existsSync } = require("fs");

const FRAMER_PROJECT_LINK_KEY = "FRAMER_PROJECT_LINK";

/**
 * Parse a simple .env file into a key/value object.
 * Supports # comments and quoted values.
 */
function loadEnv(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }

  const env = {};

  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function getFramerProjectLink(env) {
  if (!env) {
    return null;
  }

  const value = env[FRAMER_PROJECT_LINK_KEY]?.trim();

  if (!value) {
    return null;
  }

  return value;
}

module.exports = {
  FRAMER_PROJECT_LINK_KEY,
  getFramerProjectLink,
  loadEnv,
};
