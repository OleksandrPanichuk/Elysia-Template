import { existsSync } from "node:fs";
import { relative } from "node:path";

import { applyPlan } from "./apply";
import { booleanFlag, parseArgs, type ParsedArgs, stringFlag } from "./args";
import {
  planJob,
  planModule,
  planPlugin,
  planResource,
  planService,
  planUseCase,
} from "./commands";
import { resolveDatabaseAdapter } from "./database";
import { API_ROOT, REPO_ROOT } from "./paths";
import type { Plan } from "./plan";

const USAGE = `Usage: bun run gen <command> [arguments] [flags]

Commands
  module <name>                 an empty module, registered in app.modules.ts
  resource <plural-name>        a full CRUD module: entity, model, DTOs, repository
                                port and adapter, service, use cases, routes, module,
                                schema, migration and HTTP test
  service <module> <name>       a service inside an existing module
  use-case <module> <name>      a use case inside an existing module
  job <module> <name>           a background job inside an existing module
  plugin <name>                 an Elysia plugin in src/plugins

Flags
  --db <adapter>                repository adapter for a resource; defaults to
                                DATABASE_ADAPTER in the root .env, then postgres
  --singular <name>             singular form when it cannot be guessed
  --no-migration                skip drizzle-kit for a postgres resource
  --dry-run                     print what would change and write nothing
  --force                       overwrite files that already exist`;

const print = (line: string): void => {
  process.stdout.write(`${line}\n`);
};

const argument = (args: ParsedArgs, index: number, label: string): string => {
  const value = args.positionals[index];

  if (!value) {
    throw new Error(`Missing ${label}.\n\n${USAGE}`);
  }

  return value;
};

const buildPlan = (args: ParsedArgs): Plan => {
  switch (args.command) {
    case "module":
      return planModule(argument(args, 0, "module name"), existsSync);

    case "resource":
      return planResource(
        {
          name: argument(args, 0, "resource name"),
          singular: stringFlag(args, "singular"),
          adapter: resolveDatabaseAdapter(stringFlag(args, "db")),
        },
        existsSync,
      );

    case "service":
      return planService(
        argument(args, 0, "module name"),
        argument(args, 1, "service name"),
        existsSync,
      );

    case "use-case":
      return planUseCase(
        argument(args, 0, "module name"),
        argument(args, 1, "use case name"),
        existsSync,
      );

    case "job":
      return planJob(
        argument(args, 0, "module name"),
        argument(args, 1, "job name"),
        existsSync,
      );

    case "plugin":
      return planPlugin(argument(args, 0, "plugin name"));

    default:
      throw new Error(
        args.command ? `Unknown command "${args.command}".\n\n${USAGE}` : USAGE,
      );
  }
};

const run = (command: string[], env: Record<string, string> = {}): boolean => {
  const result = Bun.spawnSync(command, {
    cwd: API_ROOT,
    env: { ...Bun.env, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });

  if (result.exitCode !== 0) {
    process.stderr.write(result.stdout.toString());
    process.stderr.write(result.stderr.toString());
  }

  return result.exitCode === 0;
};

const main = async (): Promise<void> => {
  const args = parseArgs(Bun.argv.slice(2));

  if (args.command === undefined || args.command === "help") {
    print(USAGE);
    return;
  }

  const plan = buildPlan(args);
  const dryRun = booleanFlag(args, "dry-run");
  const writes = await applyPlan(plan, {
    dryRun,
    force: booleanFlag(args, "force"),
  });

  for (const write of writes) {
    print(
      `${dryRun ? "would " : ""}${write.created ? "create" : "update"}  ${relative(REPO_ROOT, write.path)}`,
    );
  }

  if (dryRun) return;

  const formatted = run([
    "bunx",
    "eslint",
    "--fix",
    ...writes.map((write) => relative(API_ROOT, write.path)),
  ]);

  if (!formatted) {
    console.error(
      "eslint --fix left problems in the generated files; see above.",
    );
  }

  if (plan.migration && !booleanFlag(args, "no-migration")) {
    const migrated = run(
      ["bunx", "--bun", "drizzle-kit", "generate", "--name", plan.migration],
      {
        DATABASE_URL:
          Bun.env.DATABASE_URL ??
          "postgresql://generator:generator@localhost:5432/generator",
      },
    );

    print(
      migrated
        ? `migration  ${plan.migration} generated in apps/api/drizzle`
        : "drizzle-kit could not generate the migration; run make db-generate yourself.",
    );
  }

  for (const note of plan.notes) {
    print(`\nnote: ${note}`);
  }
};

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
