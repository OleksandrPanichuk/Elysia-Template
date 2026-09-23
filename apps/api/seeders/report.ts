import type { SeederReport } from "./seeder";

const LABEL_WIDTH = 34;

export const formatReports = (reports: readonly SeederReport[]): string =>
  reports
    .flatMap(({ name, outcomes }) => [
      name,
      ...outcomes.map(({ status, label, credentials }) => {
        const details = Object.entries(credentials)
          .map(([key, value]) => `${key}=${value}`)
          .join("  ");

        return `  ${status.padEnd(8)}  ${label.padEnd(LABEL_WIDTH)}  ${details}`;
      }),
    ])
    .join("\n");
