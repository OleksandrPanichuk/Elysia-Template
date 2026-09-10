export type ReadinessCheck = () => Promise<boolean>;

export type ReadinessStatus = "up" | "down";

const checks = new Map<string, ReadinessCheck>();

export const registerReadinessCheck = (
  name: string,
  check: ReadinessCheck,
): void => {
  checks.set(name, check);
};

export const runReadinessChecks = async (): Promise<
  Record<string, ReadinessStatus>
> => {
  const entries = await Promise.all(
    [...checks].map(async ([name, check]) => {
      const ok = await check().catch(() => false);

      return [name, ok ? "up" : "down"] as const;
    }),
  );

  return Object.fromEntries(entries);
};

export const resetReadinessChecks = (): void => {
  checks.clear();
};
