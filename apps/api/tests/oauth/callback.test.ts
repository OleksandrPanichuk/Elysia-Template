import { completeOAuth, createGuest, useOAuthIdentity } from "@tests/helpers";
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { pino } from "pino";

import { make } from "@/core/registry";
import { getLogger, setLogger } from "@/infrastructure";
import { OAuthProviderName } from "@/modules/oauth";
import { UsersRepository } from "@/modules/users";

const { Google } = OAuthProviderName;

const captureLogs = (): { lines: string[]; restore: () => void } => {
  const lines: string[] = [];
  const previous = getLogger();

  setLogger(
    pino({ level: "error" }, { write: (line: string) => lines.push(line) }),
  );

  return { lines, restore: () => setLogger(previous) };
};

describe("callback failures", () => {
  const spies: Array<{ mockRestore(): void }> = [];

  afterEach(() => {
    for (const spy of spies.splice(0)) spy.mockRestore();
  });

  test("redirects with OAUTH_FAILED and logs an unexpected error", async () => {
    const logs = captureLogs();
    const spy = spyOn(make(UsersRepository), "findByEmail").mockRejectedValue(
      new Error("database exploded"),
    );
    spies.push(spy);

    try {
      useOAuthIdentity(Google);

      const guest = createGuest();
      const { location } = await completeOAuth(guest, Google);

      expect(location).toContain("error=OAUTH_FAILED");
      expect((await guest.get("/api/users/me")).status).toBe(401);

      const failure = logs.lines.find((line) =>
        line.includes("database exploded"),
      );
      expect(failure).toBeDefined();
      expect(failure).toContain('"provider":"google"');
    } finally {
      logs.restore();
    }
  });
});
