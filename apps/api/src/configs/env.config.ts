import z from "zod";

export enum NodeEnv {
  Development = "development",
  Production = "production",
  Test = "test",
}

export enum LogLevel {
  Fatal = "fatal",
  Error = "error",
  Warn = "warn",
  Info = "info",
  Debug = "debug",
  Trace = "trace",
  Silent = "silent",
}

export const EnvSchema = z.object({
  NODE_ENV: z.enum(NodeEnv).default(NodeEnv.Development),
  PORT: z.coerce.number().int().positive().min(0).max(65535).default(8080),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  CORS_ORIGIN: z
    .string()
    .default("*")
    .transform((value) =>
      value === "*"
        ? true
        : value
            .split(",")
            .map((origin) => origin.trim())
            .filter(Boolean),
    ),
  LOG_LEVEL: z.enum(LogLevel).optional(),
  LOG_PRETTY: z.stringbool().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export const loadEnv = (source: unknown = Bun.env): Env => {
  const result = EnvSchema.safeParse(source);

  if (!result.success) {
    console.error(`Invalid environment:\n${z.prettifyError(result.error)}`);
    process.exit(1);
  }

  return result.data;
};

let cached: Env | undefined;

export const getEnv = (): Env => (cached ??= loadEnv());

export const setEnv = (env: Env | undefined): void => {
  cached = env;
};
