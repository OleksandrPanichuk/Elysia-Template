# CLAUDE.md

Turborepo monorepo. The API lives in `apps/api` (Bun + Elysia + Drizzle/Postgres).

## Use cases

Every use case declares its own input type **in its own file**. Do not reuse an
HTTP DTO or a persistence type as a use case's input — a use case may need
inputs that no single repository method accepts, and those three contracts drift
apart over time.

The convention, in this order:

```ts
export interface CreateUserUseCaseOptions {
  name: string;
}

type Options = CreateUserUseCaseOptions;
type Result = UserEntity;

export class CreateUserUseCase extends UseCase<Options, Result> {
  public async execute({ name }: Options): Promise<Result> { ... }
}
```

- The exported name is `<UseCaseName>Options` (e.g. `CreateUserUseCaseOptions`),
  so it stays unambiguous when imported elsewhere.
- Local `Options` / `Result` aliases keep the class signature and `execute`
  readable, and give one place to change either side.
- When a use case takes no input, use `type Options = void` and skip the
  exported interface until real options exist.
- Export the options type from `use-cases/index.ts` alongside the class.

## Type vocabulary

Each layer owns its own shape; the route maps between them:

```
CreateUserInput  ->  <UseCase>Options  ->  CreateUserData  ->  UserEntity  ->  UserModel
   (HTTP in)          (use case)          (persistence)       (domain)       (HTTP out)
```

Keep them distinct even when identical — an HTTP-only field (a captcha token,
say) must not be able to reach the database layer.
