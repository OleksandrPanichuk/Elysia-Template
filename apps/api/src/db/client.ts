import { SQL } from "bun";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";

import { getEnv } from "@/configs";
import { SECOND } from "@/constants";

import * as schema from "./schema";

const PING_TIMEOUT_MS = 2 * SECOND;

export type Database = ReturnType<typeof createDatabase>;

export interface DatabaseOptions {
  url: string;
  poolMax?: number;
  statementTimeoutMs?: number;
}

export const createDatabase = ({
  url,
  poolMax,
  statementTimeoutMs,
}: DatabaseOptions) => {
  const client = new SQL({
    url,
    max: poolMax,
    connection: statementTimeoutMs
      ? { statement_timeout: statementTimeoutMs }
      : undefined,
  });

  return Object.assign(drizzle({ client, schema }), {
    close: () => client.close(),
  });
};

const fromEnv = (): DatabaseOptions => {
  const env = getEnv();

  return {
    url: env.DATABASE_URL,
    poolMax: env.DATABASE_POOL_MAX,
    statementTimeoutMs: env.DATABASE_STATEMENT_TIMEOUT_MS,
  };
};

let cached: Database | undefined;

export const getDatabase = (): Database =>
  (cached ??= createDatabase(fromEnv()));

export const setDatabase = (db: Database | undefined): void => {
  cached = db;
};

export const pingDatabase = async (
  timeoutMs: number = PING_TIMEOUT_MS,
): Promise<void> => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Database ping timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    await Promise.race([getDatabase().execute(sql`select 1`), timeout]);
  } finally {
    clearTimeout(timer);
  }
};

export const closeDatabase = async (): Promise<void> => {
  await cached?.close();
  cached = undefined;
};
