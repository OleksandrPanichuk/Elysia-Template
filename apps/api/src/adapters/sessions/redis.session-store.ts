import type { Redis } from "ioredis";
import z from "zod";

import { getEnv } from "@/configs";
import { getLogger } from "@/infrastructure";
import type { RedisConnection } from "@/infrastructure/redis";
import type { SessionEntity } from "@/modules/sessions/session.entity";
import {
  byNewestFirst,
  SessionStore,
  type StoredSession,
} from "@/modules/sessions/session.store";
import { SessionStoreUnavailableError } from "@/modules/sessions/sessions.errors";

const OPERATION_TIMEOUT_MS = 3_000;

const StoredSessionSchema = z
  .object({
    id: z.uuid(),
    userId: z.uuid(),
    createdAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().positive(),
    userAgent: z.string().nullable().default(null),
    ip: z.string().nullable().default(null),
  })
  .refine((session) => session.expiresAt > session.createdAt);

class CorruptSessionError extends Error {}

export class RedisSessionStore extends SessionStore {
  constructor(
    private readonly connection: RedisConnection,
    private readonly keyPrefix = getEnv().SESSIONS_KEY_PREFIX,
  ) {
    super();
  }

  public create(tokenHash: string, session: SessionEntity): Promise<boolean> {
    return this.execute(async (client) => {
      const result = await client.set(
        this.key(tokenHash),
        JSON.stringify(session),
        "PXAT",
        session.expiresAt,
        "NX",
      );

      if (result !== "OK") return false;

      await client.sadd(this.userKey(session.userId), tokenHash);
      await this.extendIndex(client, session.userId, session.expiresAt);

      return true;
    });
  }

  public findByTokenHash(tokenHash: string): Promise<SessionEntity | null> {
    return this.execute(async (client) => {
      const value = await client.get(this.key(tokenHash));

      if (value === null) return null;

      return this.decode(value, tokenHash);
    }).catch((error: unknown) => {
      if (!(error instanceof CorruptSessionError)) throw error;

      return null;
    });
  }

  public listByUserId(userId: string): Promise<StoredSession[]> {
    return this.execute(async (client) => {
      const indexKey = this.userKey(userId);
      const members = await client.smembers(indexKey);

      if (members.length === 0) return [];

      const values = await client.mget(
        ...members.map((member) => this.key(member)),
      );

      const sessions: StoredSession[] = [];
      const stale: string[] = [];

      members.forEach((tokenHash, index) => {
        const value = values[index];

        if (value === null || value === undefined) {
          stale.push(tokenHash);
          return;
        }

        const session = this.tryDecode(value, tokenHash);

        if (!session) {
          stale.push(tokenHash);
          return;
        }

        sessions.push({ ...session, tokenHash });
      });

      if (stale.length > 0) {
        await client.srem(indexKey, ...stale);
      }
      return sessions.sort(byNewestFirst);
    });
  }

  public extend(tokenHash: string, expiresAt: number): Promise<void> {
    return this.execute(async (client) => {
      const value = await client.get(this.key(tokenHash));

      if (value === null) return;

      const session = this.tryDecode(value, tokenHash);

      if (!session) return;

      await client.set(
        this.key(tokenHash),
        JSON.stringify({ ...session, expiresAt }),
        "PXAT",
        expiresAt,
        "XX",
      );
      await this.extendIndex(client, session.userId, expiresAt);
    });
  }

  private async extendIndex(
    client: Redis,
    userId: string,
    expiresAt: number,
  ): Promise<void> {
    const indexKey = this.userKey(userId);
    const hasExpiry = (await client.pttl(indexKey)) >= 0;

    if (hasExpiry) {
      await client.pexpireat(indexKey, expiresAt, "GT");
    } else {
      await client.pexpireat(indexKey, expiresAt);
    }
  }

  public deleteByTokenHash(tokenHash: string): Promise<void> {
    return this.execute(async (client) => {
      const value = await client.get(this.key(tokenHash));

      await client.del(this.key(tokenHash));

      if (value === null) return;

      const session = this.tryDecode(value, tokenHash);

      if (session) {
        await client.srem(this.userKey(session.userId), tokenHash);
      }
    });
  }

  public deleteByUserId(userId: string): Promise<void> {
    return this.execute(async (client) => {
      const indexKey = this.userKey(userId);
      const members = await client.smembers(indexKey);

      if (members.length > 0) {
        await client.del(...members.map((member) => this.key(member)));
      }

      await client.del(indexKey);
    });
  }

  public deleteByUserIdExcept(
    userId: string,
    tokenHash: string,
  ): Promise<void> {
    return this.execute(async (client) => {
      const indexKey = this.userKey(userId);
      const members = await client.smembers(indexKey);

      const doomed = members.filter((member) => member !== tokenHash);

      if (doomed.length === 0) return;

      await client.del(...doomed.map((member) => this.key(member)));
      await client.srem(indexKey, ...doomed);
    });
  }

  private decode(value: string, tokenHash: string): SessionEntity {
    const session = this.tryDecode(value, tokenHash);

    if (!session) {
      throw new CorruptSessionError("Invalid stored session");
    }

    return session;
  }

  private tryDecode(value: string, tokenHash: string): SessionEntity | null {
    try {
      const result = StoredSessionSchema.safeParse(JSON.parse(value));

      if (result.success) return result.data;

      getLogger().warn(
        {
          component: "RedisSessionStore",
          tokenHash,
          issues: result.error.issues,
        },
        "discarding malformed session record",
      );
    } catch (error) {
      getLogger().warn(
        { component: "RedisSessionStore", tokenHash, err: error },
        "discarding unparsable session record",
      );
    }

    return null;
  }

  private key(tokenHash: string): string {
    return `${this.keyPrefix}${tokenHash}`;
  }

  private userKey(userId: string): string {
    return `${this.keyPrefix}user:${userId}`;
  }

  private async execute<T>(
    operation: (client: Redis) => Promise<T>,
  ): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new SessionStoreUnavailableError("operation timed out"));
        }, OPERATION_TIMEOUT_MS);
      });

      return await Promise.race([
        this.connection.connect().then(operation),
        timeout,
      ]);
    } catch (error) {
      if (error instanceof CorruptSessionError) throw error;

      if (error instanceof SessionStoreUnavailableError) {
        getLogger().error(
          { component: "RedisSessionStore", err: error },
          "session store unavailable",
        );
        throw error;
      }

      getLogger().error(
        { component: "RedisSessionStore", err: error },
        "session store operation failed",
      );

      throw new SessionStoreUnavailableError(error);
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    }
  }
}
