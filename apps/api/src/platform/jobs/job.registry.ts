import type { Token } from "@/core/registry";

import type { Job } from "./job";

const registered = new Set<Token<Job<unknown>>>();

export const registerJob = (job: Token<Job<unknown>>): void => {
  registered.add(job);
};

export const registeredJobs = (): ReadonlyArray<Token<Job<unknown>>> => [
  ...registered,
];

export const resetRegisteredJobs = (): void => {
  registered.clear();
};
