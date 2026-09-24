const IMPORT_STATEMENT = /^import[\s\S]*?from\s+"[^"]+";\n/gm;

const JOBS_MODULE_ENTRY = "  jobsModule,\n";

const insertImport = (source: string, statement: string): string => {
  const imports = [...source.matchAll(IMPORT_STATEMENT)];
  const last = imports.at(-1);

  if (!last) return `${statement}\n${source}`;

  const end = last.index + last[0].length;

  return `${source.slice(0, end)}${statement}\n${source.slice(end)}`;
};

export interface ModuleRegistration {
  exportName: string;
  importPath: string;
}

const MODULES_ARRAY = "export const modules = [";

export const registerModule = (
  source: string,
  { exportName, importPath }: ModuleRegistration,
): string => {
  if (new RegExp(`\\b${exportName}\\b`).test(source)) {
    throw new Error(`${exportName} is already registered in app.modules.ts`);
  }

  const arrayStart = source.indexOf(MODULES_ARRAY);
  const entry =
    arrayStart === -1 ? -1 : source.indexOf(JOBS_MODULE_ENTRY, arrayStart);

  if (entry === -1) {
    throw new Error(
      "app.modules.ts has no jobsModule entry in its modules array to insert before; register the module by hand",
    );
  }

  const listed = `${source.slice(0, entry)}  ${exportName},\n${source.slice(entry)}`;

  return insertImport(listed, `import { ${exportName} } from "${importPath}";`);
};

export const appendLine = (source: string, line: string): string => {
  if (source.split("\n").includes(line)) return source;

  const base =
    source.length === 0 || source.endsWith("\n") ? source : `${source}\n`;

  return `${base}${line}\n`;
};
