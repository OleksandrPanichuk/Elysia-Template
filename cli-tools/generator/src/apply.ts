import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { Plan } from "./plan";

export interface ApplyOptions {
  dryRun: boolean;
  force: boolean;
}

interface Write {
  path: string;
  content: string;
  created: boolean;
}

const normalize = (content: string): string => `${content.trim()}\n`;

export const applyPlan = async (
  plan: Plan,
  { dryRun, force }: ApplyOptions,
): Promise<Write[]> => {
  const collisions = plan.changes
    .filter((change) => change.kind === "create" && existsSync(change.path))
    .map((change) => change.path);

  if (collisions.length > 0 && !force) {
    throw new Error(
      `These files already exist; pass --force to overwrite them:\n  ${collisions.join("\n  ")}`,
    );
  }

  const writes: Write[] = [];

  for (const change of plan.changes) {
    if (change.kind === "create") {
      writes.push({
        path: change.path,
        content: normalize(change.content),
        created: true,
      });
      continue;
    }

    const pending = writes.find((write) => write.path === change.path);
    const current = pending
      ? pending.content
      : await readFile(change.path, "utf8").catch(() => {
          throw new Error(
            `Cannot ${change.describe}: ${change.path} is missing`,
          );
        });
    const next = change.apply(current);

    if (pending) {
      pending.content = next;
    } else if (next !== current) {
      writes.push({ path: change.path, content: next, created: false });
    }
  }

  if (dryRun) return writes;

  for (const write of writes) {
    await mkdir(dirname(write.path), { recursive: true });
    await writeFile(write.path, write.content);
  }

  return writes;
};
