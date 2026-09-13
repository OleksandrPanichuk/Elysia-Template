import z from "zod";

import { LogLevel } from "@/shared/types";

export enum NodeEnv {
  Development = "development",
  Production = "production",
  Test = "test",
}

export const EnvSchema = z.object({
  NODE_ENV: z.enum(NodeEnv).default(NodeEnv.Development),
  PORT: z.coerce.number().int().positive().min(0).max(65535).default(8080),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  CORS_ORIGIN: z
    .string()
    .default("http://localhost:3000")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .pipe(
      z
        .array(
          z
            .url({ protocol: /^https?$/ })
            .refine(
              (value) => new URL(value).origin === value,
              "Use an exact origin without a path or trailing slash",
            ),
        )
        .min(1),
    ),
  LOG_LEVEL: z.enum(LogLevel).optional(),
  LOG_PRETTY: z.stringbool().optional(),
  SESSIONS_REDIS_URL: z.url({ protocol: /^rediss?$/ }).optional(),
  SESSIONS_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(60 * 60 * 24 * 7)
    .default(60 * 60 * 24 * 7),
  SESSIONS_KEY_PREFIX: z.string().default("velo:sessions:"),
  APP_URL: z
    .url({ protocol: /^https?$/ })
    .default("http://localhost:3000")
    .refine(
      (value) => new URL(value).origin === value,
      "Use an exact origin without a path or trailing slash",
    ),
  MAIL_FROM: z.email().default("no-reply@velo.local"),
  EMAIL_VERIFICATION_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(60 * 60 * 24 * 7)
    .default(60 * 60 * 24),
  PASSWORD_RESET_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(60 * 60 * 24)
    .default(60 * 60),
  MAIL_FROM_NAME: z.string().trim().min(1).default("Unknown Sender"),
  MAIL_FROM_ADDRESS: z.email().default("no-reply@example.com"),
  SMTP_URL: z.url({ protocol: /^smtp$/ }).optional(),

  JOBS_REDIS_URL: z.url({ protocol: /^rediss?$/ }).optional(),
  CACHE_REDIS_URL: z.url({ protocol: /^rediss?$/ }).optional(),
  RATE_LIMIT_REDIS_URL: z.url({ protocol: /^rediss?$/ }).optional(),

  OAUTH_STATE_SECRET: z.string().min(32).optional(),
  OAUTH_REDIRECT_BASE: z
    .url({ protocol: /^https?$/ })
    .refine(
      (value) => new URL(value).origin === value,
      "Use an exact origin without a path or trailing slash",
    )
    .optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GITHUB_CLIENT_ID: z.string().min(1).optional(),
  GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

type RequiredOutsideTestKey = NonNullable<
  {
    [K in keyof Env]: undefined extends Env[K] ? K : never;
  }[keyof Env]
>;

const requireOutsideTest =
  (...keys: RequiredOutsideTestKey[]) =>
  (env: Env, ctx: z.RefinementCtx): void => {
    if (env.NODE_ENV === NodeEnv.Test) return;

    for (const key of keys) {
      if (env[key] !== undefined) continue;

      ctx.addIssue({
        code: "custom",
        path: [key],
        message: 'Required unless NODE_ENV is "test"',
      });
    }
  };

const CheckedEnvSchema = EnvSchema.superRefine(
  requireOutsideTest(
    "SESSIONS_REDIS_URL",
    "SMTP_URL",
    "JOBS_REDIS_URL",
    "CACHE_REDIS_URL",
  ),
);

export const loadEnv = (source: unknown = Bun.env): Env => {
  const result = CheckedEnvSchema.safeParse(source);

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
