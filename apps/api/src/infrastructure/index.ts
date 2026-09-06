import { closeLogger } from "./logger";

export * from "./logger";

/*
 * Releases every infrastructure resource this process owns.
 * The logger is flushed last so earlier failures still get recorded.
 */
export const closeInfrastructure = async (): Promise<void> => {
  await closeLogger();
};
