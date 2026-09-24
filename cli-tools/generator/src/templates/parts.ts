import type { Names } from "../names";

export const emptyModuleFile = (module: Names): string => `
import { defineModule } from "@/core/module";

export const ${module.camel}Module = defineModule({
  name: "${module.kebab}",
});
`;

export const emptyModuleIndexFile = (module: Names): string => `
export { ${module.camel}Module } from "./${module.kebab}.module";
`;

export const serviceFile = (service: Names): string => `
import { Service } from "@/core/service";

export class ${service.pascal}Service extends Service {}
`;

export const useCaseFile = (useCase: Names): string => `
import { UseCase } from "@/core/use-case";

type Options = void;
type Result = void;

export class ${useCase.pascal}UseCase extends UseCase<Options, Result> {
  public execute(): Promise<Result> {
    return Promise.resolve();
  }
}
`;

export const pluginFile = (plugin: Names): string => `
import { Elysia } from "elysia";

export const ${plugin.camel}Plugin = new Elysia({ name: "${plugin.kebab}" }).as(
  "global",
);
`;

export const jobFile = (module: Names, job: Names): string => `
import { Job } from "@/platform/jobs";

import { type ${job.pascal}Payload, ${job.pascal}PayloadSchema } from "./schema";

export class ${job.pascal}Job extends Job<${job.pascal}Payload> {
  public readonly name = "${module.kebab}.${job.kebab}";
  public readonly queue = "${module.kebab}";
  public readonly schema = ${job.pascal}PayloadSchema;

  public handle(): Promise<void> {
    return Promise.resolve();
  }
}
`;

export const jobSchemaFile = (job: Names): string => `
import z from "zod";

export const ${job.pascal}PayloadSchema = z.object({});

export type ${job.pascal}Payload = z.infer<typeof ${job.pascal}PayloadSchema>;
`;

export const jobIndexFile = (job: Names): string => `
export { ${job.pascal}Job } from "./job";
export { type ${job.pascal}Payload, ${job.pascal}PayloadSchema } from "./schema";
`;
