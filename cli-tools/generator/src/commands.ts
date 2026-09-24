import { join } from "node:path";

import { isPostgres } from "./database";
import { appendLine, registerModule } from "./edits";
import { type Names, namesOf, singularOf } from "./names";
import {
  API_SRC,
  API_TESTS,
  APP_MODULES_FILE,
  moduleDir,
  PLUGINS_INDEX_FILE,
  SCHEMA_DIR,
  SCHEMA_INDEX_FILE,
} from "./paths";
import { type Change, create, edit, type Plan } from "./plan";
import * as parts from "./templates/parts";
import * as resource from "./templates/resource";

export type Exists = (path: string) => boolean;

const withoutSuffix = (input: string, suffix: string): Names => {
  const names = namesOf(input);
  const words = names.kebab.split("-");
  const suffixWords = suffix.split("-");
  const tail = words.slice(-suffixWords.length).join("-");

  if (tail === suffix && words.length > suffixWords.length) {
    return namesOf(words.slice(0, -suffixWords.length).join("-"));
  }

  return names;
};

const requireModule = (module: Names, exists: Exists): string => {
  const dir = moduleDir(module.kebab);

  if (!exists(join(dir, "index.ts"))) {
    throw new Error(
      `No module "${module.kebab}" at ${dir}; generate it first with: gen module ${module.kebab}`,
    );
  }

  return dir;
};

const appendOrCreate = (path: string, line: string, exists: Exists): Change =>
  exists(path)
    ? edit(path, `export ${line}`, (source) => appendLine(source, line))
    : create(path, `${line}\n`);

const registration = (module: Names): Change =>
  edit(APP_MODULES_FILE, `register ${module.camel}Module`, (source) =>
    registerModule(source, {
      exportName: `${module.camel}Module`,
      importPath: `@/modules/${module.kebab}`,
    }),
  );

export const planModule = (name: string, exists: Exists): Plan => {
  const module = namesOf(name);
  const dir = moduleDir(module.kebab);

  if (exists(join(dir, "index.ts"))) {
    throw new Error(`Module "${module.kebab}" already exists at ${dir}`);
  }

  return {
    changes: [
      create(
        join(dir, `${module.kebab}.module.ts`),
        parts.emptyModuleFile(module),
      ),
      create(join(dir, "index.ts"), parts.emptyModuleIndexFile(module)),
      registration(module),
    ],
    notes: [],
  };
};

export interface ResourceOptions {
  name: string;
  singular?: string;
  adapter: string;
}

export const resourceContext = ({
  name,
  singular,
  adapter,
}: ResourceOptions): resource.ResourceContext => {
  const plural = namesOf(name);

  return {
    plural,
    singular: singular ? namesOf(singular) : singularOf(plural),
    adapter: namesOf(adapter),
    postgres: isPostgres(adapter),
  };
};

export const planResource = (
  options: ResourceOptions,
  exists: Exists,
): Plan => {
  const context = resourceContext(options);
  const { plural: p, singular: s, adapter } = context;
  const dir = moduleDir(p.kebab);

  if (exists(join(dir, "index.ts"))) {
    throw new Error(`Module "${p.kebab}" already exists at ${dir}`);
  }

  const at = (...segments: string[]) => join(dir, ...segments);

  const changes: Change[] = [
    create(at(`${s.kebab}.entity.ts`), resource.entityFile(context)),
    create(at(`${s.kebab}.model.ts`), resource.modelFile(context)),
    create(
      at("dto", `create-${s.kebab}.dto.ts`),
      resource.createDtoFile(context),
    ),
    create(
      at("dto", `update-${s.kebab}.dto.ts`),
      resource.updateDtoFile(context),
    ),
    create(at("dto", "index.ts"), resource.dtoIndexFile(context)),
    create(
      at(`${p.kebab}.repository.ts`),
      resource.repositoryPortFile(context),
    ),
    create(
      at("repositories", `${p.kebab}.${adapter.kebab}.repository.ts`),
      context.postgres
        ? resource.postgresRepositoryFile(context)
        : resource.stubRepositoryFile(context),
    ),
    create(
      at("repositories", "index.ts"),
      resource.repositoriesIndexFile(context),
    ),
    create(at(`${p.kebab}.errors.ts`), resource.errorsFile(context)),
    create(at(`${p.kebab}.service.ts`), resource.serviceFile(context)),
    create(
      at("use-cases", `create-${s.kebab}.ts`),
      resource.createUseCaseFile(context),
    ),
    create(
      at("use-cases", `get-${s.kebab}.ts`),
      resource.getUseCaseFile(context),
    ),
    create(
      at("use-cases", `list-${p.kebab}.ts`),
      resource.listUseCaseFile(context),
    ),
    create(
      at("use-cases", `update-${s.kebab}.ts`),
      resource.updateUseCaseFile(context),
    ),
    create(
      at("use-cases", `delete-${s.kebab}.ts`),
      resource.deleteUseCaseFile(context),
    ),
    create(at("use-cases", "index.ts"), resource.useCasesIndexFile(context)),
    create(
      at("routes", `create-${s.kebab}.route.ts`),
      resource.createRouteFile(context),
    ),
    create(
      at("routes", `get-${s.kebab}.route.ts`),
      resource.getRouteFile(context),
    ),
    create(
      at("routes", `list-${p.kebab}.route.ts`),
      resource.listRouteFile(context),
    ),
    create(
      at("routes", `update-${s.kebab}.route.ts`),
      resource.updateRouteFile(context),
    ),
    create(
      at("routes", `delete-${s.kebab}.route.ts`),
      resource.deleteRouteFile(context),
    ),
    create(at("routes", "index.ts"), resource.routesIndexFile(context)),
    create(at(`${p.kebab}.routes.ts`), resource.routesFile(context)),
    create(at(`${p.kebab}.module.ts`), resource.moduleFile(context)),
    create(at("index.ts"), resource.moduleIndexFile(context)),
    registration(p),
  ];

  const notes: string[] = [];

  if (context.postgres) {
    changes.push(
      create(
        join(SCHEMA_DIR, `${p.snake}.schema.ts`),
        resource.schemaFile(context),
      ),
      edit(SCHEMA_INDEX_FILE, `export ${p.snake}.schema`, (source) =>
        appendLine(source, `export * from "./${p.snake}.schema";`),
      ),
      create(
        join(API_TESTS, p.kebab, `${p.kebab}.test.ts`),
        resource.testFile(context),
      ),
    );
  } else {
    notes.push(
      `The ${adapter.kebab} repository is a stub: every method rejects until you implement it in repositories/${p.kebab}.${adapter.kebab}.repository.ts.`,
      `No schema, migration or HTTP test was generated, since those templates exist only for postgres.`,
    );
  }

  return {
    changes,
    ...(context.postgres ? { migration: `create_${p.snake}` } : {}),
    notes,
  };
};

export const planService = (
  moduleName: string,
  name: string,
  exists: Exists,
): Plan => {
  const module = namesOf(moduleName);
  const service = withoutSuffix(name, "service");
  const dir = requireModule(module, exists);

  return {
    changes: [
      create(
        join(dir, `${service.kebab}.service.ts`),
        parts.serviceFile(service),
      ),
      edit(join(dir, "index.ts"), `export ${service.pascal}Service`, (source) =>
        appendLine(
          source,
          `export { ${service.pascal}Service } from "./${service.kebab}.service";`,
        ),
      ),
    ],
    notes: [],
  };
};

export const planUseCase = (
  moduleName: string,
  name: string,
  exists: Exists,
): Plan => {
  const module = namesOf(moduleName);
  const useCase = withoutSuffix(name, "use-case");
  const dir = requireModule(module, exists);

  return {
    changes: [
      create(
        join(dir, "use-cases", `${useCase.kebab}.ts`),
        parts.useCaseFile(useCase),
      ),
      appendOrCreate(
        join(dir, "use-cases", "index.ts"),
        `export { ${useCase.pascal}UseCase } from "./${useCase.kebab}";`,
        exists,
      ),
      edit(join(dir, "index.ts"), "export the use cases", (source) =>
        source.includes(`"./use-cases"`)
          ? source
          : appendLine(source, `export * from "./use-cases";`),
      ),
    ],
    notes: [
      `Give ${useCase.pascal}UseCase its own ${useCase.pascal}UseCaseOptions when it takes input, as CLAUDE.md describes.`,
    ],
  };
};

export const planPlugin = (name: string): Plan => {
  const plugin = withoutSuffix(name, "plugin");

  return {
    changes: [
      create(
        join(API_SRC, "plugins", `${plugin.kebab}.plugin.ts`),
        parts.pluginFile(plugin),
      ),
      edit(PLUGINS_INDEX_FILE, `export ${plugin.camel}Plugin`, (source) =>
        appendLine(source, `export * from "./${plugin.kebab}.plugin";`),
      ),
    ],
    notes: [
      `Mount ${plugin.camel}Plugin in createApp (src/core/app.ts) where its hooks should run, or return it from a module's plugins().`,
    ],
  };
};

export const planJob = (
  moduleName: string,
  name: string,
  exists: Exists,
): Plan => {
  const module = namesOf(moduleName);
  const job = withoutSuffix(name, "job");
  const dir = requireModule(module, exists);
  const jobDir = join(dir, "jobs", job.kebab);

  return {
    changes: [
      create(join(jobDir, "job.ts"), parts.jobFile(module, job)),
      create(join(jobDir, "schema.ts"), parts.jobSchemaFile(job)),
      create(join(jobDir, "index.ts"), parts.jobIndexFile(job)),
      appendOrCreate(
        join(dir, "jobs", "index.ts"),
        `export * from "./${job.kebab}";`,
        exists,
      ),
      edit(join(dir, "index.ts"), "export the jobs", (source) =>
        source.includes(`"./jobs"`)
          ? source
          : appendLine(source, `export * from "./jobs";`),
      ),
    ],
    notes: [
      `Call registerJob(${job.pascal}Job) in ${module.camel}Module's register() so the jobs module starts it.`,
    ],
  };
};
