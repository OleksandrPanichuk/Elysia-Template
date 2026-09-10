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

## Layering: modules, adapters, infrastructure

Where a file lives is decided by what it imports.

```
modules/<name>/      domain, ports (abstract classes), use cases, routes, DB repositories
adapters/<tech>/     implementations of module ports over an external technology
infrastructure/<tech>/ technology clients: connect, reconnect, ping, close
```

- **`infrastructure/`** knows nothing about the domain. A file here imports only
  `configs` and `shared`, and could be copied into an unrelated project
  unchanged. Redis client, S3 client, Kafka connection, logger.
- **`adapters/`** implement a port a module declares, using an infrastructure
  client. This is the only layer that imports from both `modules/` and
  `infrastructure/`. `RedisSessionStore` extends `SessionStore` and uses the
  Redis client.
- **`modules/`** declare ports named for the capability, not the vendor:
  `FileStorage`, `JobQueue`, `EventPublisher`, never `S3Storage`. Several
  adapters may satisfy one port. Modules import from `core`, `shared`,
  `configs`, and other modules' barrels. Never from `adapters/` or
  `infrastructure/`, except inside the module definition file's lifecycle
  hooks (`register`, `start`, `shutdown`), which form the composition root:
  they bind the port to an adapter, register readiness checks, and open and
  close the module's connections.

**Database repositories are the one exception.** A Drizzle repository stays
inside its module under `repositories/`, because it is bound to that module's
schema and Postgres is the system of record, not a swappable backend.
Everything else that implements a port over an external system is an adapter.

Ports live in `modules/<name>/ports/` once a module has more than one.
An adapter imports the port file directly (`@/modules/x/ports/y`), never the
module barrel: the barrel exports the module definition, which imports the
adapter, and going through it forms an import cycle that fails at runtime.

An adapter may depend on other ports instead of an external SDK. A router that
picks between transports is still an adapter, because it implements a port the
module declares.

Inbound message handlers follow the HTTP split: the transport loop
(subscribe, ack, retry) is the adapter; the handler that calls a use case
lives in the module, next to its routes, started and stopped through the
module's `start` and `shutdown` hooks.
