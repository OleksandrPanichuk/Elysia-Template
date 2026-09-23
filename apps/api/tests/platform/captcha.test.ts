import {
  createGuest,
  createUser,
  DEFAULT_PASSWORD,
  type TestClient,
} from "@tests/helpers";
import { afterEach, describe, expect, spyOn, test } from "bun:test";

import {
  MEMORY_CAPTCHA_TOKENS,
  type MemoryCaptchaVerifier,
} from "@/adapters/captcha/memory.captcha-verifier";
import { make } from "@/core/registry";
import { SIGN_IN_RATE_LIMIT, SIGN_UP_RATE_LIMIT } from "@/modules/auth";
import {
  CAPTCHA_KIND_HEADER,
  CAPTCHA_TOKEN_HEADER,
  CaptchaVerifier,
} from "@/platform/captcha";
import { RateLimitStore } from "@/platform/rate-limit";

interface ErrorBody {
  code: string;
}

const verifier = (): MemoryCaptchaVerifier =>
  make(CaptchaVerifier) as MemoryCaptchaVerifier;

const captcha = (
  token: string,
  kind: "score" | "challenge" = "score",
): Record<string, string> => ({
  [CAPTCHA_TOKEN_HEADER]: token,
  [CAPTCHA_KIND_HEADER]: kind,
});

let counter = 0;

const signUp = (client: TestClient, headers?: Record<string, string>) =>
  client.post<ErrorBody>(
    "/api/auth/sign-up",
    {
      email: `captcha${++counter}@example.test`,
      password: DEFAULT_PASSWORD,
      name: "Captcha",
    },
    headers,
  );

describe("captcha on sign-up", () => {
  test("refuses a request without a token", async () => {
    const response = await signUp(createGuest({ captcha: false }));

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("CAPTCHA_REQUIRED");
  });

  test("accepts a passing score", async () => {
    const response = await signUp(createGuest({ captcha: false }), {
      ...captcha(MEMORY_CAPTCHA_TOKENS.pass),
    });

    expect(response.status).toBe(200);
    expect(verifier().verifications().at(-1)?.action).toBe("sign_up");
  });

  test("asks for a challenge on a low score, then accepts the solved one", async () => {
    const client = createGuest({ captcha: false });
    const body = {
      email: "low-score@example.test",
      password: DEFAULT_PASSWORD,
      name: "Low",
    };

    const scored = await client.post<ErrorBody>(
      "/api/auth/sign-up",
      body,
      captcha(MEMORY_CAPTCHA_TOKENS.lowScore),
    );

    expect(scored.status).toBe(403);
    expect(scored.body.code).toBe("CAPTCHA_CHALLENGE_REQUIRED");

    const solved = await client.post(
      "/api/auth/sign-up",
      body,
      captcha(MEMORY_CAPTCHA_TOKENS.solved, "challenge"),
    );

    expect(solved.status).toBe(200);
  });

  test("refuses a token that does not verify", async () => {
    const response = await signUp(createGuest({ captcha: false }), {
      ...captcha("junk"),
    });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("CAPTCHA_FAILED");
  });

  test("refuses an unknown kind", async () => {
    const response = await signUp(createGuest({ captcha: false }), {
      [CAPTCHA_TOKEN_HEADER]: MEMORY_CAPTCHA_TOKENS.pass,
      [CAPTCHA_KIND_HEADER]: "telepathy",
    });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("CAPTCHA_FAILED");
  });

  test("fails closed when the provider is unreachable", async () => {
    const response = await signUp(createGuest({ captcha: false }), {
      ...captcha(MEMORY_CAPTCHA_TOKENS.unavailable),
    });

    expect(response.status).toBe(503);
    expect(response.body.code).toBe("CAPTCHA_UNAVAILABLE");
  });

  test("counts against the rate limit before it asks the provider", async () => {
    const client = createGuest({ captcha: false });

    for (let i = 0; i < SIGN_UP_RATE_LIMIT.limit; i += 1) {
      await signUp(client, captcha(MEMORY_CAPTCHA_TOKENS.pass));
    }

    const before = verifier().verifications().length;
    const response = await signUp(client, captcha("junk"));

    expect(response.status).toBe(429);
    expect(verifier().verifications()).toHaveLength(before);
  });
});

describe("captcha on the mail endpoints", () => {
  test("is required for a password reset email", async () => {
    const response = await createGuest({ captcha: false }).post<ErrorBody>(
      "/api/auth/send-reset-password-token",
      { email: "someone@example.test" },
    );

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("CAPTCHA_REQUIRED");
  });

  test("is required for a verification email", async () => {
    const response = await createGuest({ captcha: false }).post<ErrorBody>(
      "/api/auth/send-email-verification-token",
      { email: "someone@example.test" },
    );

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("CAPTCHA_REQUIRED");
  });
});

describe("captcha on sign-in", () => {
  const attempt = (email: string, password = "wrong-password") =>
    createGuest({ captcha: false }).post<ErrorBody>("/api/auth/sign-in", {
      email,
      password,
    });

  test("is not needed for the first few attempts", async () => {
    const user = await createUser();

    for (let i = 0; i < 5; i += 1) {
      expect((await attempt(user.email)).status).toBe(401);
    }

    expect(verifier().verifications()).toHaveLength(1);
  });

  test("is required once the address has used five attempts", async () => {
    const user = await createUser();

    for (let i = 0; i < 5; i += 1) await attempt(user.email);

    const blocked = await attempt(user.email, DEFAULT_PASSWORD);

    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe("CAPTCHA_REQUIRED");

    const solved = await createGuest().post("/api/auth/sign-in", {
      email: user.email,
      password: DEFAULT_PASSWORD,
    });

    expect(solved.status).toBe(200);
  });

  test("counts each address on its own", async () => {
    const tried = await createUser();
    const untouched = await createUser();

    for (let i = 0; i < 5; i += 1) await attempt(tried.email);

    expect((await attempt(tried.email)).status).toBe(403);
    expect((await attempt(untouched.email)).status).toBe(401);
  });

  describe("when the rate-limit store cannot be read", () => {
    const spies: Array<{ mockRestore(): void }> = [];

    afterEach(() => {
      for (const spy of spies.splice(0)) spy.mockRestore();
    });

    test("asks for a captcha from the first attempt", async () => {
      spies.push(
        spyOn(make(RateLimitStore), "peek").mockResolvedValue(
          SIGN_IN_RATE_LIMIT.limit,
        ),
      );
      const user = await createUser();

      const response = await attempt(user.email, DEFAULT_PASSWORD);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe("CAPTCHA_REQUIRED");
    });
  });
});
