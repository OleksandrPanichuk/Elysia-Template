import { loadEnv, setEnv } from "@/configs";
import { SECOND } from "@/constants";
import { closeModules, createApp, startModules } from "@/core/app";
import { closeDatabase } from "@/db";
import { closeInfrastructure, getLogger } from "@/infrastructure";

const SHUTDOWN_TIMEOUT_MS = 10 * SECOND;

async function bootstrap() {
  const env = loadEnv();
  setEnv(env);

  const logger = getLogger();

  const app = createApp();

  await startModules();

  app.listen(env.PORT, ({ url }) => {
    logger.info({ url: String(url) }, `API is listening on PORT: ${env.PORT}`);
  });

  let closing = false;

  const shutdown = async (signal: NodeJS.Signals) => {
    if (closing) return;
    closing = true;

    logger.info({ signal }, "shutting down");

    let stage = "server";

    const deadline = setTimeout(() => {
      logger.error(
        { stage, timeoutMs: SHUTDOWN_TIMEOUT_MS },
        "shutdown did not finish in time",
      );
      logger.flush(() => process.exit(1));
    }, SHUTDOWN_TIMEOUT_MS);

    try {
      await app.stop();
      stage = "modules";
      await closeModules();
      stage = "database";
      await closeDatabase();
    } catch (error) {
      logger.error({ err: error, stage }, "shutdown failed");
    } finally {
      stage = "infrastructure";
      await closeInfrastructure();
      clearTimeout(deadline);
      process.exit(0);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

try {
  await bootstrap();
} catch (error) {
  getLogger().fatal({ err: error }, "failed to start");
  await closeModules().catch(() => undefined);
  await closeInfrastructure();
  process.exit(1);
}
