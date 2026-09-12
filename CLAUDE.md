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
modules/<name>/          domain, ports (abstract classes), use cases, routes, DB repositories
adapters/<capability>/   implementations of module ports over an external technology
infrastructure/<tech>/   technology clients: connect, reconnect, ping, close
```

- **`infrastructure/`** knows nothing about the domain. A file here imports only
  `configs` and `shared`, and could be copied into an unrelated project
  unchanged. Redis client, S3 client, Kafka connection, logger.
- **`adapters/`** implement a port a module declares, using an infrastructure
  client. This is the only layer that imports from both `modules/` and
  `infrastructure/`. `RedisSessionStore` extends `SessionStore` and uses a
  `RedisConnection`.
- **`modules/`** declare ports named for the capability, not the vendor:
  `FileStorage`, `JobQueue`, `EventPublisher`, never `S3Storage`. Several
  adapters may satisfy one port. Modules import from `core`, `shared`,
  `configs`, and other modules' barrels. Never from `adapters/` or
  `infrastructure/`, except inside the module definition file, which is the
  composition root: it binds the port to an adapter and opens and closes the
  module's connections.

Adapters are grouped by **capability, not by technology** — the folder is named
after the port's owning module, and the file after the technology:

```
adapters/mail/       smtp.mailer.ts        log.mailer.ts
adapters/sessions/   redis.session-store.ts
adapters/jobs/       bullmq.job-queue.ts   memory.job-queue.ts
adapters/cache/      redis.cache.ts        memory.cache.ts
```

Siblings in one folder are the alternatives you pick between in `register()`,
which is the question you actually ask when reading them. Grouping by
technology breaks down immediately: `memory.*` and `log.*` adapters use no
external technology at all, and one adapter may use two.

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

## Module lifecycle

`defineModule` gives every module four hooks. `register` is **synchronous** and
returns the module's state; the other three receive it as `{ state }`.

```ts
export const cacheModule = defineModule({
  name: "cache",

  register: ({ env }) => {
    if (env.NODE_ENV === NodeEnv.Test) {
      const cache = new MemoryCache();
      bind(Cache, () => cache);

      return { cache, connection: undefined };
    }

    const connection = new RedisConnection({
      name: "cache",
      url: env.CACHE_REDIS_URL,
      options: { connectTimeout: 2 * SECOND, enableOfflineQueue: false },
    });
    const cache = new RedisCache(connection);

    bind(Cache, () => cache);

    return { cache, connection };
  },

  start: ({ state }) => state.cache.verify(),
  ready: ({ state }) => state.connection?.ping() ?? true,
  shutdown: ({ state }) => state.cache.close(),
});
```

- **`register`** — declare intent, never do I/O. Construct adapters and
  connections, `bind` ports, `registerJob`, and return state. It must be
  synchronous (the type system enforces this), so anything that awaits belongs
  in `start`. It runs for every module before any `start`, so cross-module
  bindings are guaranteed to exist by then.
- **`start`** — open connections, verify them, begin consuming.
- **`ready`** — the readiness probe behind `/health`. Registered and removed
  automatically with the module.
- **`shutdown`** — close what `start` opened. Modules shut down in **reverse**
  order, so a module may rely on modules listed before it still being alive.

Every port that talks to an external system gets a `Memory*` / `Log*` adapter
bound under `NODE_ENV=test`, so the whole app boots in-process with no Redis,
SMTP or network. Choose the adapter in `register` — never branch on the
environment inside the adapter itself.

**Order in `modules/index.ts` is load-bearing.** A module must come after the
modules it depends on at `start`, and `jobsModule` stays **last**: it begins
consuming after every producer's dependencies are up, and reverse-order
shutdown stops it consuming before anything it calls is torn down.

## Background jobs

A job is a singleton class — definition and handler in one unit, resolved
through `make()` like a use case. The payload is an argument, never a
constructor parameter: only JSON crosses Redis, so the instance cannot travel.

```ts
export class SendEmailJob extends Job<SendEmailPayload> {
  public readonly name = NotificationQueueJobs.SendEmail;
  public readonly queue = NOTIFICATIONS_QUEUE;
  public readonly schema = SendEmailPayloadSchema;

  private readonly mailer = make(Mailer);

  public async handle(payload: SendEmailPayload): Promise<void> { ... }
}
```

The owning module calls `registerJob(SendEmailJob)` in its `register`;
`jobsModule.start` resolves and starts every registered job after verifying the
connection. A producer module never creates or closes a worker.

Dispatch through the job, not the queue: `make(SendEmailJob).dispatch(payload)`.
The zod `schema` is validated when the job is **consumed**, not when it is
dispatched — a malformed payload fails the job without burning retries.

## Caching

Two layers, with different invalidation stories. Pick deliberately.

- **Service cache** — `Cache` port used inside a service method. Use it for
  per-entity reads whose write sites you control. The read and the invalidation
  live in the same class, a few lines apart:
  `findById` caches, `markEmailVerified` writes then `del`s the key.
- **Route cache** — `cache: { ttlMs }` on `defineRoute`. TTL-only, with no
  event-driven invalidation, so it suits expensive or composed `GET`s that no
  single service method can cache. Do **not** put it on a route whose data is
  invalidated elsewhere: a service-level `del` does not clear route entries.

A cache is an optimization, never a dependency: `RedisCache` treats an
unavailable connection and a malformed entry as a miss and never throws.
Cached values are validated by a schema on read, because JSON round-trips turn
`Date` into `string`.
