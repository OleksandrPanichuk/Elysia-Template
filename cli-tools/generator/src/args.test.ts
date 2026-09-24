import { describe, expect, test } from "bun:test";

import { booleanFlag, parseArgs, stringFlag } from "./args";

describe("parseArgs", () => {
  test("splits the command, its arguments and its flags", () => {
    const args = parseArgs([
      "resource",
      "people",
      "--singular",
      "person",
      "--db=mongo",
      "--dry-run",
    ]);

    expect(args.command).toBe("resource");
    expect(args.positionals).toEqual(["people"]);
    expect(stringFlag(args, "singular")).toBe("person");
    expect(stringFlag(args, "db")).toBe("mongo");
    expect(booleanFlag(args, "dry-run")).toBe(true);
  });

  test("never lets a boolean flag swallow the next argument", () => {
    const args = parseArgs(["service", "--force", "billing", "pricing"]);

    expect(args.positionals).toEqual(["billing", "pricing"]);
    expect(booleanFlag(args, "force")).toBe(true);
  });
});
