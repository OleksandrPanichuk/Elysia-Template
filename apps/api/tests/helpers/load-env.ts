import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Bun reads .env.test relative to the working directory, so a run started from
// the repository root would leave the app unconfigured — and app modules read
// the environment while they are being imported, before any test hook runs.
// This file is preloaded ahead of everything else so the variables exist first.
// It never overwrites what the environment already provides.
const file = resolve(import.meta.dir, "../../.env.test");

if (existsSync(file)) {
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");

    if (separator <= 0) continue;

    process.env[trimmed.slice(0, separator).trim()] ??= trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}
