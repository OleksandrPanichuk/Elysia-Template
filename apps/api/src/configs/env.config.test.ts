import { describe, expect, test } from "bun:test";

import { EnvSchema, loadEnv, NodeEnv } from "./env.config";

const base = {
  NODE_ENV: NodeEnv.Test,
  DATABASE_URL: "postgresql://unused:unused@127.0.0.1:5432/unused",
};

describe("app identity in the environment", () => {
  test("defaults to a generic name and slug", () => {
    const env = loadEnv(base);

    expect(env.APP_NAME).toBe("App");
    expect(env.APP_SLUG).toBe("app");
  });

  test("sends mail under the app name unless told otherwise", () => {
    expect(loadEnv({ ...base, APP_NAME: "Acme" }).MAIL_FROM_NAME).toBe("Acme");
    expect(
      loadEnv({ ...base, APP_NAME: "Acme", MAIL_FROM_NAME: "Acme Support" })
        .MAIL_FROM_NAME,
    ).toBe("Acme Support");
  });

  test.each(["acme", "acme-2", "a1"])("accepts the slug %p", (slug) => {
    expect(EnvSchema.shape.APP_SLUG.safeParse(slug).success).toBe(true);
  });

  test.each([
    "Acme",
    "acme app",
    "acme:app",
    "-acme",
    "acme-",
    "acme--app",
    "",
  ])("rejects the slug %p", (slug) => {
    expect(EnvSchema.shape.APP_SLUG.safeParse(slug).success).toBe(false);
  });
});
