export type SeedStatus = "created" | "existing";

export interface SeedOutcome {
  status: SeedStatus;
  label: string;
  credentials: Readonly<Record<string, string>>;
}

export interface Seeder {
  readonly name: string;
  run(): Promise<SeedOutcome[]>;
}

export interface SeederReport {
  name: string;
  outcomes: SeedOutcome[];
}
