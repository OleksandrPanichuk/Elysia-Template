import type { Names } from "../names";

export interface ResourceContext {
  plural: Names;
  singular: Names;
  adapter: Names;
  postgres: boolean;
}

const human = (names: Names): string => names.kebab.replaceAll("-", " ");

const sentence = (names: Names): string => {
  const text = human(names);

  return text.charAt(0).toUpperCase() + text.slice(1);
};

const repositoryClass = ({ adapter, plural }: ResourceContext): string =>
  `${adapter.pascal}${plural.pascal}Repository`;

export const entityFile = ({ singular: s }: ResourceContext): string => `
import type { ${s.pascal}Model } from "./${s.kebab}.model";

export interface ${s.pascal}Entity {
  id: string;
  ownerId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ${s.pascal}Entity {
  public static normalize(entity: ${s.pascal}Entity): ${s.pascal}Model {
    return {
      id: entity.id,
      name: entity.name,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
`;

export const modelFile = ({ singular: s }: ResourceContext): string => `
import { t } from "elysia";

export const ${s.pascal}Model = t.Object({
  id: t.String({ format: "uuid" }),
  name: t.String(),
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});
export type ${s.pascal}Model = typeof ${s.pascal}Model.static;

export const ${s.pascal}MessageModel = t.Object({
  message: t.String(),
});
export type ${s.pascal}MessageModel = typeof ${s.pascal}MessageModel.static;
`;

export const createDtoFile = ({ singular: s }: ResourceContext): string => `
import { t } from "elysia";

import { MAX_NAME_LENGTH } from "@/constants";

export const Create${s.pascal}Input = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LENGTH }),
});
export type Create${s.pascal}Input = typeof Create${s.pascal}Input.static;
`;

export const updateDtoFile = ({ singular: s }: ResourceContext): string => `
import { t } from "elysia";

import { MAX_NAME_LENGTH } from "@/constants";

export const Update${s.pascal}Input = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: MAX_NAME_LENGTH })),
});
export type Update${s.pascal}Input = typeof Update${s.pascal}Input.static;
`;

export const dtoIndexFile = ({ singular: s }: ResourceContext): string => `
export { Create${s.pascal}Input } from "./create-${s.kebab}.dto";
export { Update${s.pascal}Input } from "./update-${s.kebab}.dto";
`;

export const repositoryPortFile = ({
  singular: s,
  plural: p,
}: ResourceContext): string => `
import { Repository } from "@/core/repository";

import type { ${s.pascal}Entity } from "./${s.kebab}.entity";

export interface Create${s.pascal}Data {
  ownerId: string;
  name: string;
}

export interface Update${s.pascal}Data {
  name?: string;
}

export abstract class ${p.pascal}Repository extends Repository {
  public abstract insert(data: Create${s.pascal}Data): Promise<${s.pascal}Entity>;

  public abstract findOwned(
    id: string,
    ownerId: string,
  ): Promise<${s.pascal}Entity | null>;

  public abstract updateOwned(
    id: string,
    ownerId: string,
    data: Update${s.pascal}Data,
  ): Promise<${s.pascal}Entity | null>;

  public abstract deleteOwned(id: string, ownerId: string): Promise<boolean>;
}
`;

export const postgresRepositoryFile = (context: ResourceContext): string => {
  const { singular: s, plural: p } = context;
  const table = `${p.camel}Schema`;

  return `
import { and, eq } from "drizzle-orm";

import { ${table} } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import type { ${s.pascal}Entity } from "../${s.kebab}.entity";
import {
  type Create${s.pascal}Data,
  ${p.pascal}Repository,
  type Update${s.pascal}Data,
} from "../${p.kebab}.repository";

export class ${repositoryClass(context)} extends ${p.pascal}Repository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async insert(data: Create${s.pascal}Data): Promise<${s.pascal}Entity> {
    const [row] = await this.db.insert(${table}).values(data).returning();

    return row!;
  }

  public async findOwned(
    id: string,
    ownerId: string,
  ): Promise<${s.pascal}Entity | null> {
    const [row] = await this.db
      .select()
      .from(${table})
      .where(this.owned(id, ownerId))
      .limit(1);

    return row ?? null;
  }

  public async updateOwned(
    id: string,
    ownerId: string,
    data: Update${s.pascal}Data,
  ): Promise<${s.pascal}Entity | null> {
    const [row] = await this.db
      .update(${table})
      .set({ ...data, updatedAt: new Date() })
      .where(this.owned(id, ownerId))
      .returning();

    return row ?? null;
  }

  public async deleteOwned(id: string, ownerId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(${table})
      .where(this.owned(id, ownerId))
      .returning({ id: ${table}.id });

    return deleted.length > 0;
  }

  private owned(id: string, ownerId: string) {
    return and(eq(${table}.id, id), eq(${table}.ownerId, ownerId));
  }
}
`;
};

export const stubRepositoryFile = (context: ResourceContext): string => {
  const { singular: s, plural: p } = context;
  const name = repositoryClass(context);
  const pending = (method: string) =>
    `Promise.reject(new Error("${name}.${method} is not implemented"))`;

  return `
import type { ${s.pascal}Entity } from "../${s.kebab}.entity";
import {
  type Create${s.pascal}Data,
  ${p.pascal}Repository,
  type Update${s.pascal}Data,
} from "../${p.kebab}.repository";

export class ${name} extends ${p.pascal}Repository {
  public insert(_data: Create${s.pascal}Data): Promise<${s.pascal}Entity> {
    return ${pending("insert")};
  }

  public findOwned(
    _id: string,
    _ownerId: string,
  ): Promise<${s.pascal}Entity | null> {
    return ${pending("findOwned")};
  }

  public updateOwned(
    _id: string,
    _ownerId: string,
    _data: Update${s.pascal}Data,
  ): Promise<${s.pascal}Entity | null> {
    return ${pending("updateOwned")};
  }

  public deleteOwned(_id: string, _ownerId: string): Promise<boolean> {
    return ${pending("deleteOwned")};
  }
}
`;
};

export const repositoriesIndexFile = (context: ResourceContext): string => `
export { ${repositoryClass(context)} } from "./${context.plural.kebab}.${context.adapter.kebab}.repository";
`;

export const errorsFile = ({ singular: s }: ResourceContext): string => `
import { ModuleError } from "@/core/errors";
import { HttpStatus } from "@/core/http";

export class ${s.pascal}NotFoundError extends ModuleError {
  public readonly status = HttpStatus.NotFound;
  public readonly code = "${s.constant}_NOT_FOUND";
}
`;

export const serviceFile = ({
  singular: s,
  plural: p,
}: ResourceContext): string => `
import { makeRepository } from "@/core/registry";
import { Service } from "@/core/service";

import type { ${s.pascal}Entity } from "./${s.kebab}.entity";
import { ${s.pascal}NotFoundError } from "./${p.kebab}.errors";
import { ${p.pascal}Repository } from "./${p.kebab}.repository";

export class ${p.pascal}Service extends Service {
  private readonly repository = makeRepository(${p.pascal}Repository);

  public async getOwned(id: string, ownerId: string): Promise<${s.pascal}Entity> {
    const entity = await this.repository.findOwned(id, ownerId);

    if (!entity) {
      throw new ${s.pascal}NotFoundError("${sentence(s)} not found");
    }

    return entity;
  }
}
`;

export const createUseCaseFile = ({
  singular: s,
  plural: p,
}: ResourceContext): string => `
import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { ${s.pascal}Entity } from "../${s.kebab}.entity";
import { ${p.pascal}Repository } from "../${p.kebab}.repository";

export interface Create${s.pascal}UseCaseOptions {
  ownerId: string;
  name: string;
}

type Options = Create${s.pascal}UseCaseOptions;
type Result = ${s.pascal}Entity;

export class Create${s.pascal}UseCase extends UseCase<Options, Result> {
  private readonly repository = makeRepository(${p.pascal}Repository);

  public execute({ ownerId, name }: Options): Promise<Result> {
    return this.repository.insert({ ownerId, name });
  }
}
`;

export const getUseCaseFile = ({
  singular: s,
  plural: p,
}: ResourceContext): string => `
import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { ${s.pascal}Entity } from "../${s.kebab}.entity";
import { ${p.pascal}Service } from "../${p.kebab}.service";

export interface Get${s.pascal}UseCaseOptions {
  ownerId: string;
  id: string;
}

type Options = Get${s.pascal}UseCaseOptions;
type Result = ${s.pascal}Entity;

export class Get${s.pascal}UseCase extends UseCase<Options, Result> {
  private readonly service = makeService(${p.pascal}Service);

  public execute({ ownerId, id }: Options): Promise<Result> {
    return this.service.getOwned(id, ownerId);
  }
}
`;

export const updateUseCaseFile = ({
  singular: s,
  plural: p,
}: ResourceContext): string => `
import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { ${s.pascal}Entity } from "../${s.kebab}.entity";
import { ${s.pascal}NotFoundError } from "../${p.kebab}.errors";
import { ${p.pascal}Repository } from "../${p.kebab}.repository";

export interface Update${s.pascal}UseCaseOptions {
  ownerId: string;
  id: string;
  name?: string;
}

type Options = Update${s.pascal}UseCaseOptions;
type Result = ${s.pascal}Entity;

export class Update${s.pascal}UseCase extends UseCase<Options, Result> {
  private readonly repository = makeRepository(${p.pascal}Repository);

  public async execute({ ownerId, id, name }: Options): Promise<Result> {
    const updated = await this.repository.updateOwned(id, ownerId, {
      ...(name === undefined ? {} : { name }),
    });

    if (!updated) {
      throw new ${s.pascal}NotFoundError("${sentence(s)} not found");
    }

    return updated;
  }
}
`;

export const deleteUseCaseFile = ({
  singular: s,
  plural: p,
}: ResourceContext): string => `
import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import { ${s.pascal}NotFoundError } from "../${p.kebab}.errors";
import { ${p.pascal}Repository } from "../${p.kebab}.repository";

export interface Delete${s.pascal}UseCaseOptions {
  ownerId: string;
  id: string;
}

type Options = Delete${s.pascal}UseCaseOptions;
type Result = void;

export class Delete${s.pascal}UseCase extends UseCase<Options, Result> {
  private readonly repository = makeRepository(${p.pascal}Repository);

  public async execute({ ownerId, id }: Options): Promise<Result> {
    const deleted = await this.repository.deleteOwned(id, ownerId);

    if (!deleted) {
      throw new ${s.pascal}NotFoundError("${sentence(s)} not found");
    }
  }
}
`;

export const useCasesIndexFile = ({ singular: s }: ResourceContext): string => `
export {
  Create${s.pascal}UseCase,
  type Create${s.pascal}UseCaseOptions,
} from "./create-${s.kebab}";
export {
  Delete${s.pascal}UseCase,
  type Delete${s.pascal}UseCaseOptions,
} from "./delete-${s.kebab}";
export {
  Get${s.pascal}UseCase,
  type Get${s.pascal}UseCaseOptions,
} from "./get-${s.kebab}";
export {
  Update${s.pascal}UseCase,
  type Update${s.pascal}UseCaseOptions,
} from "./update-${s.kebab}";
`;

const ID_PARAMS = `params: t.Object({ id: t.String({ format: "uuid" }) }),`;

export const createRouteFile = ({
  singular: s,
  plural: p,
}: ResourceContext): string => `
import { defineRoute } from "@/core/route";

import { Create${s.pascal}Input } from "../dto";
import { ${s.pascal}Entity } from "../${s.kebab}.entity";
import { ${s.pascal}Model } from "../${s.kebab}.model";
import type { ${p.pascal}Actions } from "../${p.kebab}.routes";

export const create${s.pascal}Route = ({ create${s.pascal} }: ${p.pascal}Actions) =>
  defineRoute({
    body: Create${s.pascal}Input,
    response: ${s.pascal}Model,
    summary: "Create a ${human(s)}",
    auth: true,

    action: ({ body, user }) =>
      create${s.pascal}.execute({ ownerId: user.id, name: body.name }),
    postAction: ({ output }) => ${s.pascal}Entity.normalize(output),
  });
`;

export const getRouteFile = ({
  singular: s,
  plural: p,
}: ResourceContext): string => `
import { t } from "elysia";

import { defineRoute } from "@/core/route";

import { ${s.pascal}Entity } from "../${s.kebab}.entity";
import { ${s.pascal}Model } from "../${s.kebab}.model";
import type { ${p.pascal}Actions } from "../${p.kebab}.routes";

export const get${s.pascal}Route = ({ get${s.pascal} }: ${p.pascal}Actions) =>
  defineRoute({
    ${ID_PARAMS}
    response: ${s.pascal}Model,
    summary: "Get a ${human(s)}",
    auth: true,

    action: ({ params, user }) =>
      get${s.pascal}.execute({ ownerId: user.id, id: params.id }),
    postAction: ({ output }) => ${s.pascal}Entity.normalize(output),
  });
`;

export const updateRouteFile = ({
  singular: s,
  plural: p,
}: ResourceContext): string => `
import { t } from "elysia";

import { defineRoute } from "@/core/route";

import { Update${s.pascal}Input } from "../dto";
import { ${s.pascal}Entity } from "../${s.kebab}.entity";
import { ${s.pascal}Model } from "../${s.kebab}.model";
import type { ${p.pascal}Actions } from "../${p.kebab}.routes";

export const update${s.pascal}Route = ({ update${s.pascal} }: ${p.pascal}Actions) =>
  defineRoute({
    ${ID_PARAMS}
    body: Update${s.pascal}Input,
    response: ${s.pascal}Model,
    summary: "Update a ${human(s)}",
    auth: true,

    action: ({ params, body, user }) =>
      update${s.pascal}.execute({
        ownerId: user.id,
        id: params.id,
        name: body.name,
      }),
    postAction: ({ output }) => ${s.pascal}Entity.normalize(output),
  });
`;

export const deleteRouteFile = ({
  singular: s,
  plural: p,
}: ResourceContext): string => `
import { t } from "elysia";

import { defineRoute } from "@/core/route";

import { ${s.pascal}MessageModel } from "../${s.kebab}.model";
import type { ${p.pascal}Actions } from "../${p.kebab}.routes";

export const delete${s.pascal}Route = ({ delete${s.pascal} }: ${p.pascal}Actions) =>
  defineRoute({
    ${ID_PARAMS}
    response: ${s.pascal}MessageModel,
    summary: "Delete a ${human(s)}",
    auth: true,

    action: ({ params, user }) =>
      delete${s.pascal}.execute({ ownerId: user.id, id: params.id }),
    postAction: () => ({ message: "ok" }),
  });
`;

export const routesIndexFile = ({ singular: s }: ResourceContext): string => `
export { create${s.pascal}Route } from "./create-${s.kebab}.route";
export { delete${s.pascal}Route } from "./delete-${s.kebab}.route";
export { get${s.pascal}Route } from "./get-${s.kebab}.route";
export { update${s.pascal}Route } from "./update-${s.kebab}.route";
`;

export const routesFile = ({
  singular: s,
  plural: p,
}: ResourceContext): string => `
import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import {
  create${s.pascal}Route,
  delete${s.pascal}Route,
  get${s.pascal}Route,
  update${s.pascal}Route,
} from "./routes";
import type {
  Create${s.pascal}UseCase,
  Delete${s.pascal}UseCase,
  Get${s.pascal}UseCase,
  Update${s.pascal}UseCase,
} from "./use-cases";

export interface ${p.pascal}Actions {
  create${s.pascal}: Executable<Create${s.pascal}UseCase>;
  get${s.pascal}: Executable<Get${s.pascal}UseCase>;
  update${s.pascal}: Executable<Update${s.pascal}UseCase>;
  delete${s.pascal}: Executable<Delete${s.pascal}UseCase>;
}

export const ${p.camel}Routes = (actions: ${p.pascal}Actions) =>
  new Elysia({ name: "${p.kebab}", prefix: "/${p.kebab}" })
    .post("/", ...create${s.pascal}Route(actions))
    .get("/:id", ...get${s.pascal}Route(actions))
    .patch("/:id", ...update${s.pascal}Route(actions))
    .delete("/:id", ...delete${s.pascal}Route(actions));
`;

export const moduleFile = (context: ResourceContext): string => {
  const { singular: s, plural: p } = context;

  return `
import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";

import { ${p.pascal}Repository } from "./${p.kebab}.repository";
import { ${p.camel}Routes } from "./${p.kebab}.routes";
import { ${repositoryClass(context)} } from "./repositories";
import {
  Create${s.pascal}UseCase,
  Delete${s.pascal}UseCase,
  Get${s.pascal}UseCase,
  Update${s.pascal}UseCase,
} from "./use-cases";

export const ${p.camel}Module = defineModule({
  name: "${p.kebab}",

  register: () => {
    bind(${p.pascal}Repository, () => new ${repositoryClass(context)}());
  },

  routes: () =>
    ${p.camel}Routes({
      create${s.pascal}: makeUseCase(Create${s.pascal}UseCase),
      get${s.pascal}: makeUseCase(Get${s.pascal}UseCase),
      update${s.pascal}: makeUseCase(Update${s.pascal}UseCase),
      delete${s.pascal}: makeUseCase(Delete${s.pascal}UseCase),
    }),
});
`;
};

export const moduleIndexFile = (context: ResourceContext): string => {
  const { singular: s, plural: p } = context;

  return `
export * from "./dto";
export { ${s.pascal}Entity } from "./${s.kebab}.entity";
export { ${s.pascal}MessageModel, ${s.pascal}Model } from "./${s.kebab}.model";
export { ${s.pascal}NotFoundError } from "./${p.kebab}.errors";
export { ${p.camel}Module } from "./${p.kebab}.module";
export {
  type Create${s.pascal}Data,
  ${p.pascal}Repository,
  type Update${s.pascal}Data,
} from "./${p.kebab}.repository";
export { type ${p.pascal}Actions, ${p.camel}Routes } from "./${p.kebab}.routes";
export { ${p.pascal}Service } from "./${p.kebab}.service";
export { ${repositoryClass(context)} } from "./repositories";
export * from "./use-cases";
`;
};

export const schemaFile = ({
  plural: p,
  singular: s,
}: ResourceContext): string => `
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { usersSchema } from "./users.schema";

export const ${p.camel}Schema = pgTable(
  "${p.snake}",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => usersSchema.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("${p.snake}_owner_id_idx").on(table.ownerId)],
);

export type ${s.pascal}Row = typeof ${p.camel}Schema.$inferSelect;
`;

export const testFile = ({
  singular: s,
  plural: p,
}: ResourceContext): string => `
import { createGuest, createUser } from "@tests/helpers";
import { describe, expect, test } from "bun:test";

interface ${s.pascal}Body {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

const PATH = "/api/${p.kebab}";

describe("${human(p)}", () => {
  test("creates, reads, updates and deletes one", async () => {
    const user = await createUser();

    const created = await user.post<${s.pascal}Body>(PATH, { name: "First" });

    expect(created.status).toBe(200);
    expect(created.body.name).toBe("First");

    const path = \`\${PATH}/\${created.body.id}\`;

    expect((await user.get<${s.pascal}Body>(path)).body.name).toBe("First");

    const updated = await user.patch<${s.pascal}Body>(path, { name: "Renamed" });

    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe("Renamed");

    expect((await user.delete(path)).status).toBe(200);
    expect((await user.get(path)).status).toBe(404);
  });

  test("keeps each user's ${human(p)} to themselves", async () => {
    const owner = await createUser();
    const other = await createUser();

    const created = await owner.post<${s.pascal}Body>(PATH, { name: "Mine" });
    const path = \`\${PATH}/\${created.body.id}\`;

    expect((await other.get(path)).status).toBe(404);
    expect((await other.patch(path, { name: "Theirs" })).status).toBe(404);
    expect((await other.delete(path)).status).toBe(404);
    expect((await owner.get<${s.pascal}Body>(path)).body.name).toBe("Mine");
  });

  test("refuses a guest", async () => {
    const path = \`\${PATH}/\${crypto.randomUUID()}\`;

    expect((await createGuest().get(path)).status).toBe(401);
  });

  test("refuses an empty name", async () => {
    const user = await createUser();

    expect((await user.post(PATH, { name: "" })).status).toBe(422);
  });
});
`;
