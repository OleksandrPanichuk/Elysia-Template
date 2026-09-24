import { createUser } from "@tests/helpers";
import { afterEach, describe, expect, spyOn, test } from "bun:test";

import type { MemoryErrorReporter } from "@/adapters/error-reporting/memory.error-reporter";
import { make } from "@/core/registry";
import { UsersRepository } from "@/modules/users";
import { ErrorReporter } from "@/platform/error-reporting";

const reporter = (): MemoryErrorReporter =>
  make(ErrorReporter) as MemoryErrorReporter;

describe("error reporting", () => {
  const spies: Array<{ mockRestore(): void }> = [];

  afterEach(() => {
    for (const spy of spies.splice(0)) spy.mockRestore();
  });

  test("reports an unhandled error with the request and the signed-in user", async () => {
    const user = await createUser();
    const failure = new Error("database exploded");

    spies.push(
      spyOn(make(UsersRepository), "findById").mockRejectedValue(failure),
    );

    const response = await user.get<{ requestId: string }>("/api/users/me");
    const [reported] = reporter().reports();

    expect(response.status).toBe(500);
    expect(reporter().reports()).toHaveLength(1);
    expect(reported?.error).toBe(failure);
    expect(reported?.report).toEqual({
      source: "http",
      requestId: response.body.requestId,
      userId: user.id,
      tags: { method: "GET", path: "/api/users/me" },
    });
  });

  test("does not report errors the app answers on purpose", async () => {
    const user = await createUser();

    await user.post("/api/auth/sign-in", {
      email: user.email,
      password: "not-the-password",
    });
    await user.get("/api/nowhere");
    await user.post("/api/auth/sign-in", { email: "not-an-email" });

    expect(reporter().reports()).toHaveLength(0);
  });
});
