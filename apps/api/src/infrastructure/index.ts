import { closeLogger } from "./logger";

export * from "./logger";

export const closeInfrastructure = async (): Promise<void> => {
  await closeLogger();
};
