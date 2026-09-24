import { describe, expect, test } from "bun:test";

import { isPostgres, resolveDatabaseAdapter } from "./database";

describe("resolveDatabaseAdapter", () => {
  test("prefers the flag, then DATABASE_ADAPTER, then postgres", () => {
    expect(resolveDatabaseAdapter("mongo", { DATABASE_ADAPTER: "mysql" })).toBe(
      "mongo",
    );
    expect(
      resolveDatabaseAdapter(undefined, { DATABASE_ADAPTER: " MySQL " }),
    ).toBe("mysql");
    expect(resolveDatabaseAdapter(undefined, {})).toBe("postgres");
  });

  test("refuses a value that cannot name a file", () => {
    expect(() => resolveDatabaseAdapter("my sql", {})).toThrow(
      /must be lowercase/,
    );
  });

  test("knows postgres from everything else", () => {
    expect(isPostgres("postgres")).toBe(true);
    expect(isPostgres("mongo")).toBe(false);
  });
});
