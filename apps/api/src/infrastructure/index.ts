import { closeLogger } from "./logger";
import { releaseRedisConnections } from "./redis";

export * from "./logger";

export const closeInfrastructure = async (): Promise<void> => {
  await releaseRedisConnections();
  await closeLogger();
};
