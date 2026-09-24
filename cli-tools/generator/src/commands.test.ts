import { relative } from "node:path";

import { describe, expect, test } from "bun:test";

import {
  planJob,
  planModule,
  planPlugin,
  planResource,
  planService,
  planUseCase,
} from "./commands";
import { API_ROOT, moduleDir } from "./paths";
import type { Plan } from "./plan";

const nothingExists = (): boolean => false;

const onlyModule =
  (name: string) =>
  (path: string): boolean =>
    path === `${moduleDir(name)}/index.ts`;

const paths = (plan: Plan): string[] =>
  plan.changes.map(
    (change) => `${change.kind} ${relative(API_ROOT, change.path)}`,
  );

const created = (plan: Plan, suffix: string): string => {
  const change = plan.changes.find(
    (candidate) =>
      candidate.kind === "create" && candidate.path.endsWith(suffix),
  );

  if (change?.kind !== "create") throw new Error(`no file ending in ${suffix}`);

  return change.content;
};

describe("planResource", () => {
  const postgres = planResource(
    { name: "line-items", adapter: "postgres" },
    nothingExists,
  );

  test("lays out a full module, a schema, a test and a migration for postgres", () => {
    for (const expected of [
      "create src/modules/line-items/line-item.entity.ts",
      "create src/modules/line-items/line-items.repository.ts",
      "create src/modules/line-items/repositories/line-items.postgres.repository.ts",
      "create src/modules/line-items/use-cases/list-line-items.ts",
      "create src/modules/line-items/routes/update-line-item.route.ts",
      "create src/modules/line-items/line-items.module.ts",
      "edit src/app.modules.ts",
      "create src/db/schema/line_items.schema.ts",
      "edit src/db/schema/index.ts",
      "create tests/line-items/line-items.test.ts",
    ]) {
      expect(paths(postgres)).toContain(expected);
    }
    expect(postgres.migration).toBe("create_line_items");
  });

  test("scopes every query to the owner", () => {
    const repository = created(postgres, "line-items.postgres.repository.ts");

    expect(repository).toContain("eq(lineItemsSchema.ownerId, ownerId)");
    expect(created(postgres, "line_items.schema.ts")).toContain(
      `pgTable(\n  "line_items"`,
    );
  });

  test("binds the adapter the environment names", () => {
    const mongo = planResource(
      { name: "warehouses", adapter: "mongo" },
      nothingExists,
    );

    expect(paths(mongo)).toContain(
      "create src/modules/warehouses/repositories/warehouses.mongo.repository.ts",
    );
    expect(created(mongo, "warehouses.module.ts")).toContain(
      "new MongoWarehousesRepository()",
    );
    expect(paths(mongo).some((path) => path.includes("db/schema"))).toBe(false);
    expect(mongo.migration).toBeUndefined();
    expect(mongo.notes.join(" ")).toContain("stub");
  });

  test("takes an explicit singular", () => {
    const people = planResource(
      { name: "people", singular: "person", adapter: "postgres" },
      nothingExists,
    );

    expect(paths(people)).toContain(
      "create src/modules/people/person.entity.ts",
    );
    expect(created(people, "person.entity.ts")).toContain(
      "export class PersonEntity",
    );
  });

  test("refuses a module that already exists", () => {
    expect(() =>
      planResource({ name: "users", adapter: "postgres" }, () => true),
    ).toThrow(/already exists/);
  });
});

describe("planModule", () => {
  test("creates the module and registers it", () => {
    expect(paths(planModule("billing", nothingExists))).toEqual([
      "create src/modules/billing/billing.module.ts",
      "create src/modules/billing/index.ts",
      "edit src/app.modules.ts",
    ]);
  });
});

describe("parts inside a module", () => {
  const exists = onlyModule("billing");

  test("need the module to exist", () => {
    expect(() => planService("billing", "pricing", nothingExists)).toThrow(
      /generate it first/,
    );
  });

  test("drop a repeated suffix from the name", () => {
    expect(paths(planService("billing", "pricing-service", exists))).toContain(
      "create src/modules/billing/pricing.service.ts",
    );
    expect(paths(planJob("billing", "send-receipt-job", exists))).toContain(
      "create src/modules/billing/jobs/send-receipt/job.ts",
    );
  });

  test("create a use-cases barrel when there is none", () => {
    expect(paths(planUseCase("billing", "charge-customer", exists))).toEqual([
      "create src/modules/billing/use-cases/charge-customer.ts",
      "create src/modules/billing/use-cases/index.ts",
      "edit src/modules/billing/index.ts",
    ]);
  });

  test("name a job after its module and queue", () => {
    const job = created(planJob("billing", "send-receipt", exists), "job.ts");

    expect(job).toContain(`name = "billing.send-receipt"`);
    expect(job).toContain(`queue = "billing"`);
  });
});

describe("planPlugin", () => {
  test("creates the plugin and exports it", () => {
    expect(paths(planPlugin("audit-trail"))).toEqual([
      "create src/plugins/audit-trail.plugin.ts",
      "edit src/plugins/index.ts",
    ]);
  });
});
