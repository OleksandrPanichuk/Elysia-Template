import {
  RedisConnection,
  type RedisConnectionOptions,
} from "./redis.connection";

const shared = new Map<string, RedisConnection>();

const keyOf = ({ name, url }: RedisConnectionOptions): string =>
  url ?? `@${name}`;

export const getSharedRedisConnection = (
  options: RedisConnectionOptions,
): RedisConnection => {
  const key = keyOf(options);
  const existing = shared.get(key);

  if (existing) return existing;

  const connection = new RedisConnection(options);

  shared.set(key, connection);

  return connection;
};

export const createOwnedRedisConnection = (
  options: RedisConnectionOptions,
): RedisConnection => new RedisConnection(options);

export const releaseRedisConnections = async (): Promise<void> => {
  const open = [...shared.values()];

  shared.clear();

  await Promise.all(open.map((connection) => connection.close()));
};
