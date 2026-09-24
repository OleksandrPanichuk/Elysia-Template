export const DEFAULT_DATABASE_ADAPTER = "postgres";

const ADAPTER_PATTERN = /^[a-z][a-z0-9-]*$/;

export const resolveDatabaseAdapter = (
  flag: string | undefined,
  env: Readonly<Record<string, string | undefined>> = Bun.env,
): string => {
  const value = (flag ?? env.DATABASE_ADAPTER ?? DEFAULT_DATABASE_ADAPTER)
    .trim()
    .toLowerCase();

  if (!ADAPTER_PATTERN.test(value)) {
    throw new Error(
      `DATABASE_ADAPTER "${value}" must be lowercase letters, digits and dashes, such as postgres or mongo`,
    );
  }

  return value;
};

export const isPostgres = (adapter: string): boolean =>
  adapter === DEFAULT_DATABASE_ADAPTER;
