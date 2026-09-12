import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const COMMITTED = join(REPO_ROOT, "packages/api-client/src/generated");

const PLACEHOLDER_DATABASE_URL =
  "postgresql://codegen:codegen@localhost:5432/codegen";

const run = async (command: string[], cwd: string): Promise<void> => {
  const proc = Bun.spawn(command, {
    cwd,
    env: {
      ...process.env,
      NODE_ENV: "test",
      DATABASE_URL: process.env.DATABASE_URL ?? PLACEHOLDER_DATABASE_URL,
    },
    stdout: "inherit",
    stderr: "inherit",
  });

  if ((await proc.exited) !== 0) {
    throw new Error(`command failed: ${command.join(" ")}`);
  }
};

const read = async (dir: string): Promise<Map<string, string>> => {
  const entries = await readdir(dir);
  const files = new Map<string, string>();

  for (const entry of entries.sort()) {
    files.set(entry, await readFile(join(dir, entry), "utf8"));
  }

  return files;
};

const main = async (): Promise<void> => {
  const outDir = await mkdtemp(join(tmpdir(), "api-codegen-"));

  try {
    await run(
      ["bun", join(import.meta.dir, "generate-models.ts"), outDir],
      join(REPO_ROOT, "cli-tools/api-codegen"),
    );
    await run(
      ["bun", join(import.meta.dir, "generate-client.ts"), outDir],
      join(REPO_ROOT, "apps/api"),
    );

    const fresh = await read(outDir);
    const committed = await read(COMMITTED);
    const stale: string[] = [];

    for (const [name, content] of fresh) {
      if (committed.get(name) !== content) stale.push(name);
    }

    for (const name of committed.keys()) {
      if (!fresh.has(name)) stale.push(`${name} (no longer generated)`);
    }

    if (stale.length > 0) {
      console.error(
        `generated output is stale:\n${stale.map((name) => `  - ${name}`).join("\n")}\n\nRun \`bun run generate\` and commit the result.`,
      );
      process.exit(1);
    }

    console.warn(`generated output is up to date (${fresh.size} files)`);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
};

await main();
