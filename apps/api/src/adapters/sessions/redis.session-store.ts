import type { RedisClient } from "bun";
import z from "zod";

import { getEnv } from "@/configs";
import { getLogger } from "@/infrastructure";
import { getSessionsRedis } from "@/infrastructure/redis";
import type { SessionEntity } from "@/modules/sessions/session.entity";
import { SessionStore } from "@/modules/sessions/session.store";
import { SessionStoreUnavailableError } from "@/modules/sessions/sessions.errors";

const OPERATION_TIMEOUT_MS = 3_000;

const StoredSessionSchema = z
  .object({
    id: z.uuid(),
    userId: z.uuid(),
    createdAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().positive(),
  })
  .refine((session) => session.expiresAt > session.createdAt);

class CorruptSessionError extends Error {}

export class RedisSessionStore extends SessionStore {
  constructor(
    private readonly resolveClient: () => Promise<RedisClient> = getSessionsRedis,
    private readonly keyPrefix = getEnv().SESSIONS_KEY_PREFIX,
  ) {
    super();
  }

  public create(tokenHash: string, session: SessionEntity): Promise<boolean> {
    return this.execute(async (client) => {
      const result: unknown = await client.send("SET", [
        this.key(tokenHash),
        JSON.stringify(session),
        "NX",
        "PXAT",
        String(session.expiresAt),
      ]);

      if (result !== "OK") return false;

      const indexKey = this.userKey(session.userId);

      await client.send("SADD", [indexKey, tokenHash]);
      await client.send("PEXPIREAT", [
        indexKey,
        String(session.expiresAt),
        "GT",
      ]);

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

  public deleteByTokenHash(tokenHash: string): Promise<void> {
    return this.execute(async (client) => {
      const value = await client.get(this.key(tokenHash));

      await client.del(this.key(tokenHash));

      if (value === null) return;

      const session = this.tryDecode(value, tokenHash);

      if (session) {
        await client.send("SREM", [this.userKey(session.userId), tokenHash]);
      }
    });
  }

  public deleteByUserId(userId: string): Promise<void> {
    return this.execute(async (client) => {
      const indexKey = this.userKey(userId);
      const members: unknown = await client.send("SMEMBERS", [indexKey]);

      if (Array.isArray(members) && members.length > 0) {
        await client.send("DEL", [
          ...members.map((member) => this.key(String(member))),
        ]);
      }

      await client.del(indexKey);
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
    operation: (client: RedisClient) => Promise<T>,
  ): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new SessionStoreUnavailableError("operation timed out"));
        }, OPERATION_TIMEOUT_MS);
      });

      return await Promise.race([
        this.resolveClient().then(operation),
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
