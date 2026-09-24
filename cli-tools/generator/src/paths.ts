import { join, resolve } from "node:path";

export const REPO_ROOT = resolve(import.meta.dir, "../../..");

export const API_ROOT = join(REPO_ROOT, "apps/api");

export const API_SRC = join(API_ROOT, "src");

export const API_TESTS = join(API_ROOT, "tests");

export const APP_MODULES_FILE = join(API_SRC, "app.modules.ts");

export const SCHEMA_DIR = join(API_SRC, "db/schema");

export const SCHEMA_INDEX_FILE = join(SCHEMA_DIR, "index.ts");

export const PLUGINS_INDEX_FILE = join(API_SRC, "plugins/index.ts");

export const moduleDir = (moduleName: string): string =>
  join(API_SRC, "modules", moduleName);
