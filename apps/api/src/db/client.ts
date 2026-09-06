import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";

import { getEnv } from "@/configs";

import * as schema from "./schema";

export type Database = ReturnType<typeof createDatabase>;

export const createDatabase = (url: string = getEnv().DATABASE_URL) => {
  const client = new SQL({ url });

  return Object.assign(drizzle({ client, schema }), {
    close: () => client.close(),
  });
};

let cached: Database | undefined;

export const getDatabase = (): Database => (cached ??= createDatabase());

export const setDatabase = (db: Database | undefined): void => {
  cached = db;
};

export const closeDatabase = async (): Promise<void> => {
  await cached?.close();
  cached = undefined;
};
