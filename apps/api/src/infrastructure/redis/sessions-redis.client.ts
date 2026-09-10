import { RedisClient } from "bun";

import { getEnv } from "@/configs";

let cached: RedisClient | undefined;
let connecting: Promise<RedisClient> | undefined;

export const getSessionsRedis = async (): Promise<RedisClient> => {
  if (cached?.connected) {
    return cached;
  }

  if (connecting) {
    return connecting;
  }

  const client =
    cached ??
    new RedisClient(getEnv().SESSIONS_REDIS_URL, {
      connectionTimeout: 2_000,
      autoReconnect: false,
      enableOfflineQueue: false,
    });

  cached = client;

  connecting = client
    .connect()
    .then(() => client)
    .catch((error: unknown) => {
      client.close();

      if (cached === client) {
        cached = undefined;
      }

      throw error;
    })
    .finally(() => {
      connecting = undefined;
    });

  return connecting;
};

export const closeSessionsRedis = (): void => {
  cached?.close();
  cached = undefined;
};

export const pingSessionsRedis = async (): Promise<boolean> => {
  try {
    const client = await getSessionsRedis();

    await client.send("PING", []);

    return true;
  } catch {
    return false;
  }
};
