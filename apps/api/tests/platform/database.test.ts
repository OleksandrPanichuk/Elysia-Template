import { describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { getEnv } from "@/configs";
import { createDatabase } from "@/db";

const settle = (run: () => Promise<unknown>): Promise<unknown> =>
  run().then(
    () => undefined,
    (error: unknown) => error,
  );

describe("database", () => {
  test("cancels a statement that outlives the configured timeout", async () => {
    const db = createDatabase({
      url: getEnv().DATABASE_URL,
      statementTimeoutMs: 100,
    });

    try {
      const failure = await settle(async () =>
        db.execute(sql`select pg_sleep(1)`),
      );
      const recovered = await settle(async () => db.execute(sql`select 1`));

      expect(failure).toBeInstanceOf(Error);
      expect(String((failure as Error).cause)).toMatch(/statement timeout/);
      expect(recovered).toBeUndefined();
    } finally {
      await db.close();
    }
  });
});
