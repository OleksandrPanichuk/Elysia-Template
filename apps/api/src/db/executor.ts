import { AsyncLocalStorage } from "node:async_hooks";

import { type Database, getDatabase } from "./client";

type TxCallback = Parameters<Database["transaction"]>[0];

export type Transaction = Parameters<TxCallback>[0];
export type DBExecutor = Transaction | Omit<Database, "close">;

const storage = new AsyncLocalStorage<Transaction>();

export const getExecutor = (): DBExecutor =>
  storage.getStore() ?? getDatabase();

export const transaction = <T>(fn: () => Promise<T>): Promise<T> => {
  const active = storage.getStore();

  if (active) return fn();

  return getDatabase().transaction((tx) => storage.run(tx, fn));
};
