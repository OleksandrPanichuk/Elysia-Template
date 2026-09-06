import { type Logger, type LoggerOptions, pino } from "pino";
import pretty from "pino-pretty";

import { type Env, getEnv, LogLevel, NodeEnv } from "@/configs";
import { getRequestContext } from "@/shared";

export type AppLogger = Logger;

const REDACTED_PATHS = [
  "headers.authorization",
  "headers.cookie",
  "req.headers.authorization",
  "req.headers.cookie",
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "*.password",
  "*.token",
  "*.accessToken",
  "*.refreshToken",
];

const resolveLevel = (env: Env): LogLevel =>
  env.LOG_LEVEL ??
  (env.NODE_ENV === NodeEnv.Test ? LogLevel.Silent : LogLevel.Info);

const resolvePretty = (env: Env): boolean =>
  env.LOG_PRETTY ?? env.NODE_ENV === NodeEnv.Development;

export const createLogger = (env: Env = getEnv()): AppLogger => {
  const options: LoggerOptions = {
    level: resolveLevel(env),
    base: { service: "api", env: env.NODE_ENV },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: { level: (label) => ({ level: label }) },
    mixin: () => {
      const context = getRequestContext();

      return context ? { requestId: context.requestId } : {};
    },
    redact: { paths: REDACTED_PATHS, censor: "[redacted]" },
  };

  if (!resolvePretty(env)) return pino(options);

  return pino(
    options,
    pretty({
      colorize: true,
      translateTime: "HH:MM:ss.l",
      ignore: "pid,hostname,service,env",
      messageFormat: "{msg}",
    }),
  );
};

let cached: AppLogger | undefined;

export const getLogger = (): AppLogger => (cached ??= createLogger());

export const setLogger = (logger: AppLogger | undefined): void => {
  cached = logger;
};

export const closeLogger = async (): Promise<void> => {
  const logger = cached;
  cached = undefined;

  if (!logger) return;

  await new Promise<void>((resolve) => {
    const done = setTimeout(resolve, 1_000);

    logger.flush(() => {
      clearTimeout(done);
      resolve();
    });
  });
};
