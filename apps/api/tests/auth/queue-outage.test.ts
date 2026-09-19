import { createClient, createUser, inbox } from "@tests/helpers";
import { afterEach, describe, expect, spyOn, test } from "bun:test";

import { make } from "@/core/registry";
import { JobQueue, JobQueueUnavailableError } from "@/platform/jobs";

const queueIsDown = () =>
  spyOn(make(JobQueue), "enqueue").mockRejectedValue(
    new JobQueueUnavailableError("redis is down"),
  );

describe("when the job queue is unavailable", () => {
  const spies: Array<{ mockRestore(): void }> = [];

  afterEach(() => {
    for (const spy of spies.splice(0)) spy.mockRestore();
  });

  test("sign-up still creates the account and signs the caller in", async () => {
    spies.push(queueIsDown());

    const client = createClient();
    const response = await client.post<{ userId: string }>(
      "/api/auth/sign-up",
      { email: "kate@example.test", password: "test-password-123", name: "K" },
    );

    expect(response.status).toBe(200);
    expect(response.body.userId).toBeTruthy();

    const me = await client.get<{ emailVerified: boolean }>("/api/users/me");
    expect(me.status).toBe(200);
    expect(me.body.emailVerified).toBe(false);
    expect(inbox.for("kate@example.test")).toHaveLength(0);
  });

  test("asking for a verification email reports 503", async () => {
    await createUser({ email: "kate@example.test" });
    spies.push(queueIsDown());

    const response = await createClient().post<{ code: string }>(
      "/api/auth/send-email-verification-token",
      { email: "kate@example.test" },
    );

    expect(response.status).toBe(503);
    expect(response.body.code).toBe("JOB_QUEUE_UNAVAILABLE");
  });

  test("asking for a password reset reports 503", async () => {
    await createUser({ email: "kate@example.test" });
    spies.push(queueIsDown());

    const response = await createClient().post<{ code: string }>(
      "/api/auth/send-reset-password-token",
      { email: "kate@example.test" },
    );

    expect(response.status).toBe(503);
    expect(response.body.code).toBe("JOB_QUEUE_UNAVAILABLE");
  });
});
