import { describe, expect, test } from "bun:test";

import { appendLine, registerModule } from "./edits";

const APP_MODULES = `import type { AppModule } from "@/core/module";
import { usersModule } from "@/modules/users";
import {
  jobsModule,
  queueHelpers,
} from "@/platform/jobs";

export const modules = [
  usersModule,
  jobsModule,
] as const satisfies readonly AppModule[];
`;

describe("registerModule", () => {
  test("imports the module after the last import and lists it before jobsModule", () => {
    const next = registerModule(APP_MODULES, {
      exportName: "invoicesModule",
      importPath: "@/modules/invoices",
    });

    expect(next).toContain(
      `} from "@/platform/jobs";\nimport { invoicesModule } from "@/modules/invoices";\n`,
    );
    expect(next).toContain(
      "  usersModule,\n  invoicesModule,\n  jobsModule,\n",
    );
  });

  test("refuses a module that is already registered", () => {
    expect(() =>
      registerModule(APP_MODULES, {
        exportName: "usersModule",
        importPath: "@/modules/users",
      }),
    ).toThrow(/already registered/);
  });

  test("refuses when there is no jobsModule to keep last", () => {
    expect(() =>
      registerModule(`export const modules = [];\n`, {
        exportName: "invoicesModule",
        importPath: "@/modules/invoices",
      }),
    ).toThrow(/no jobsModule entry/);
  });
});

describe("appendLine", () => {
  test("adds a line once, with a trailing newline", () => {
    const once = appendLine(`export * from "./a";`, `export * from "./b";`);

    expect(once).toBe(`export * from "./a";\nexport * from "./b";\n`);
    expect(appendLine(once, `export * from "./b";`)).toBe(once);
  });
});
