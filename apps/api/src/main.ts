import { loadEnv, setEnv } from "@/configs";
import { closeModules, createApp, startModules } from "@/core/app";
import { closeDatabase } from "@/db";
import { closeInfrastructure, getLogger } from "@/infrastructure";

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

    try {
      await app.stop();
      await closeModules();
      await closeDatabase();
    } catch (error) {
      logger.error({ err: error }, "shutdown failed");
    } finally {
      await closeInfrastructure();
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
