const { readFileSync, writeFileSync, existsSync } = require("fs");

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

function setFramerProjectLink(filePath, link) {
  const line = `${FRAMER_PROJECT_LINK_KEY}=${link}`;

  if (!existsSync(filePath)) {
    writeFileSync(filePath, `${line}\n`, "utf8");
    return;
  }

  const content = readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  let replaced = false;

  const updated = lines.map((entry) => {
    const trimmed = entry.trim();

    if (
      !trimmed.startsWith("#") &&
      trimmed.startsWith(`${FRAMER_PROJECT_LINK_KEY}=`)
    ) {
      replaced = true;
      return line;
    }

    return entry;
  });

  if (!replaced) {
    const suffix = content.endsWith("\n") ? "" : "\n";
    writeFileSync(filePath, `${content}${suffix}${line}\n`, "utf8");
    return;
  }

  writeFileSync(filePath, updated.join("\n"), "utf8");
}

module.exports = {
  FRAMER_PROJECT_LINK_KEY,
  getFramerProjectLink,
  loadEnv,
  setFramerProjectLink,
};
