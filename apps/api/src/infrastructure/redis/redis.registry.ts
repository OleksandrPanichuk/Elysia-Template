import {
  RedisConnection,
  type RedisConnectionOptions,
} from "./redis.connection";

const connections = new Map<string, RedisConnection>();

const keyOf = ({ name, url }: RedisConnectionOptions): string =>
  url ?? `@${name}`;

export const getRedisConnection = (
  options: RedisConnectionOptions,
): RedisConnection => {
  const key = keyOf(options);
  const existing = connections.get(key);

  if (existing) return existing;

  const connection = new RedisConnection(options);

  connections.set(key, connection);

  return connection;
};

export const releaseRedisConnections = async (): Promise<void> => {
  const open = [...connections.values()];

  connections.clear();

  await Promise.all(open.map((connection) => connection.close()));
};
