import type { Seeder, SeederReport } from "./seeder";
import { usersSeeder } from "./users.seeder";

export const seeders: readonly Seeder[] = [usersSeeder];

export const runSeeders = async (): Promise<SeederReport[]> => {
  const reports: SeederReport[] = [];

  for (const seeder of seeders) {
    reports.push({ name: seeder.name, outcomes: await seeder.run() });
  }

  return reports;
};

export { SEED_PASSWORD } from "./seed.constants";
export type { Seeder, SeederReport, SeedOutcome, SeedStatus } from "./seeder";
export { SEED_USERS } from "./users.seeder";
