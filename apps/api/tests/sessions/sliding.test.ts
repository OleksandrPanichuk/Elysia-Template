import { createUser } from "@tests/helpers";
import { afterEach, describe, expect, spyOn, test } from "bun:test";

import { HOUR, MINUTE } from "@/constants";
import { getSessionCookieName } from "@/modules/sessions";

interface SessionModel {
  current: boolean;
  expiresAt: string;
}

const currentExpiry = async (user: {
  get: <T>(path: string) => Promise<{ body: T }>;
}): Promise<number> => {
  const sessions = await user.get<SessionModel[]>("/api/sessions");
  const current = sessions.body.find((session) => session.current);

  return new Date(current?.expiresAt ?? 0).getTime();
};

describe("sliding sessions", () => {
  const spies: Array<{ mockRestore(): void }> = [];

  afterEach(() => {
    for (const spy of spies.splice(0)) spy.mockRestore();
  });

  const travel = (ms: number) => {
    const start = Date.now();
    spies.push(spyOn(Date, "now").mockImplementation(() => start + ms));
  };

  test("keeps the expiry where it is on a request soon after sign-in", async () => {
    const user = await createUser();
    const before = await currentExpiry(user);

    travel(5 * MINUTE);

    const response = await user.get("/api/users/me");

    expect(response.headers.getSetCookie()).toHaveLength(0);
    expect(await currentExpiry(user)).toBe(before);
  });

  test("moves the expiry forward once the session has aged", async () => {
    const user = await createUser();
    const before = await currentExpiry(user);

    travel(2 * HOUR);

    const response = await user.get("/api/users/me");
    const cookie = response.headers
      .getSetCookie()
      .find((line) => line.startsWith(`${getSessionCookieName()}=`));

    expect(response.status).toBe(200);
    expect(cookie).toContain("Expires=");
    expect(await currentExpiry(user)).toBeGreaterThan(before + HOUR);
  });
});
