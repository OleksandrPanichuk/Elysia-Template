import { BullMqJobQueue } from "@/adapters/jobs/bullmq.job-queue";
import { MemoryJobQueue } from "@/adapters/jobs/memory.job-queue";
import { NodeEnv } from "@/configs";
import { defineModule } from "@/core/module";
import { bind, make } from "@/core/registry";
import { createOwnedRedisConnection } from "@/infrastructure/redis";

import { registeredJobs } from "./job.registry";
import { JobQueue } from "./ports";

export const jobsModule = defineModule({
  name: "jobs",

  register: ({ env }) => {
    if (env.NODE_ENV === NodeEnv.Test) {
      const queue = new MemoryJobQueue();

      bind(JobQueue, () => queue);

      return { queue, connection: undefined };
    }

    const connection = createOwnedRedisConnection({
      name: "jobs",
      url: env.JOBS_REDIS_URL,
      options: {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
      },
    });
    const queue = new BullMqJobQueue(connection, `${env.APP_SLUG}:jobs`);

    bind(JobQueue, () => queue);

    return { queue, connection };
  },

  start: async ({ state }) => {
    await state.queue.verify();

    for (const token of registeredJobs()) {
      const job = make(token);

      state.queue.process(job);

      await state.queue.schedule(job);
    }
  },

  ready: ({ state }) => state.connection?.ping() ?? true,

  shutdown: ({ state }) => state.queue.close(),
});
