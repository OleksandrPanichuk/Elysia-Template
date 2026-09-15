import { describe, expect, test } from "bun:test";

import { SessionEntity } from "./session.entity";
import type { StoredSession } from "./session.store";
import { byNewestFirst } from "./session.store";

const session = (over: Partial<StoredSession> = {}): StoredSession => ({
  id: "00000000-0000-4000-8000-000000000001",
  userId: "00000000-0000-4000-8000-0000000000ff",
  createdAt: 1_000,
  expiresAt: 2_000,
  userAgent: null,
  ip: null,
  tokenHash: "hash",
  ...over,
});

describe("tokens", () => {
  test("generates a well-formed token that hashes stably", () => {
    const token = SessionEntity.generateToken();

    expect(SessionEntity.isWellFormed(token)).toBe(true);
    expect(SessionEntity.hash(token)).toBe(SessionEntity.hash(token));
    expect(SessionEntity.hash(token)).not.toBe(token);
  });

  test.each([undefined, "", "short", "z".repeat(64), "ABC".repeat(22)])(
    "rejects %p as malformed",
    (value) => {
      expect(SessionEntity.isWellFormed(value)).toBe(false);
    },
  );
});

describe("isCurrent", () => {
  test("matches only the token behind the stored hash", () => {
    const token = SessionEntity.generateToken();
    const mine = session({ tokenHash: SessionEntity.hash(token) });

    expect(SessionEntity.isCurrent(mine, token)).toBe(true);
    expect(SessionEntity.isCurrent(mine, SessionEntity.generateToken())).toBe(
      false,
    );
    expect(SessionEntity.isCurrent(mine, undefined)).toBe(false);
  });
});

describe("expiry", () => {
  test("is expired at the moment it expires, not after", () => {
    const entry = session({ expiresAt: 2_000 });

    expect(SessionEntity.isExpired(entry, 1_999)).toBe(false);
    expect(SessionEntity.isExpired(entry, 2_000)).toBe(true);
  });
});

describe("ordering", () => {
  test("puts the newest first", () => {
    const older = session({ id: "a", createdAt: 1 });
    const newer = session({ id: "b", createdAt: 2 });

    expect([older, newer].sort(byNewestFirst)).toEqual([newer, older]);
  });

  test("breaks a tie on id so eviction is deterministic", () => {
    const a = session({ id: "aaa", createdAt: 5 });
    const b = session({ id: "bbb", createdAt: 5 });

    expect([b, a].sort(byNewestFirst)).toEqual([a, b]);
    expect([a, b].sort(byNewestFirst)).toEqual([a, b]);
  });
});

describe("normalize", () => {
  test("renders timestamps as ISO strings and never leaks the hash", () => {
    const token = SessionEntity.generateToken();
    const entry = session({
      tokenHash: SessionEntity.hash(token),
      ip: "10.0.0.1",
    });

    const model = SessionEntity.normalize(entry, token);

    expect(model.createdAt).toBe(new Date(1_000).toISOString());
    expect(model.current).toBe(true);
    expect(model.ip).toBe("10.0.0.1");
    expect(model).not.toHaveProperty("tokenHash");
  });
});

describe("user agent", () => {
  test("trims an absurd one and treats empty as absent", () => {
    expect(SessionEntity.normalizeUserAgent("x".repeat(9_000))).toHaveLength(
      512,
    );
    expect(SessionEntity.normalizeUserAgent("")).toBeNull();
    expect(SessionEntity.normalizeUserAgent(undefined)).toBeNull();
  });
});
