import { Queue } from "bullmq";
import { afterAll, describe, expect, test } from "bun:test";
import z from "zod";

import { BullMqJobQueue } from "@/adapters/jobs/bullmq.job-queue";
import { getEnv } from "@/configs";
import { createOwnedRedisConnection } from "@/infrastructure/redis";
import { Job } from "@/platform/jobs";

const url = process.env.TEST_JOBS_REDIS_URL;

const KEY_PREFIX = `${getEnv().APP_SLUG}:test:jobs`;

const connection = url
  ? createOwnedRedisConnection({
      name: "test-jobs",
      url,
      options: { maxRetriesPerRequest: null },
    })
  : undefined;

const queue = connection
  ? new BullMqJobQueue(connection, KEY_PREFIX)
  : undefined;

const PayloadSchema = z.object({ value: z.string() });
type Payload = z.infer<typeof PayloadSchema>;

const handled: string[] = [];

class ProbeJob extends Job<Payload> {
  public readonly name = "test.probe";
  public readonly queue = "test-queue";
  public readonly schema = PayloadSchema;

  public handle(payload: Payload): Promise<void> {
    handled.push(payload.value);

    return Promise.resolve();
  }
}

class ScheduledProbeJob extends Job<Payload> {
  public readonly name = "test.scheduled";
  public readonly queue = "test-queue";
  public readonly schema = PayloadSchema;
  public readonly schedule = { pattern: "0 3 * * *", payload: { value: "x" } };

  public handle(): Promise<void> {
    return Promise.resolve();
  }
}

const settle = async (predicate: () => boolean): Promise<void> => {
  for (let i = 0; i < 60; i += 1) {
    if (predicate()) return;
    await Bun.sleep(50);
  }
};

afterAll(async () => {
  if (!queue || !connection) return;

  await queue.close().catch(() => undefined);

  const keys = await connection.instance
    .keys(`${KEY_PREFIX}*`)
    .catch(() => [] as string[]);

  if (keys.length > 0) await connection.instance.del(...keys);

  await connection.close().catch(() => undefined);
});

describe.skipIf(!queue)("BullMqJobQueue against a real Redis", () => {
  test("verifies the connection", async () => {
    expect(await queue!.verify().then(() => "ok")).toBe("ok");
  });

  test("carries a payload from enqueue through to the handler", async () => {
    const job = new ProbeJob();

    queue!.process(job);
    await queue!.enqueue(job, { value: "hello" });
    await settle(() => handled.includes("hello"));

    expect(handled).toContain("hello");
  });

  test("refuses a second handler for the same job", () => {
    const job = new ProbeJob();

    expect(() => queue!.process(job)).toThrow(
      /already has a registered handler/,
    );
  });

  test("upserts a schedule instead of stacking one per call", async () => {
    const job = new ScheduledProbeJob();

    await queue!.schedule(job);
    await queue!.schedule(job);

    const inspector = new Queue("test-queue", {
      connection: connection!.instance,
      prefix: KEY_PREFIX,
    });

    try {
      const schedulers = await inspector.getJobSchedulers();

      expect(schedulers).toHaveLength(1);
      expect(schedulers[0]?.key).toBe(job.name);
      expect(schedulers[0]?.pattern).toBe("0 3 * * *");
    } finally {
      await inspector.close();
    }
  });
});
