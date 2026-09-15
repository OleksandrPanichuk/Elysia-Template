# api

A [Turborepo](https://turborepo.dev/) monorepo containing an
[Elysia](https://elysiajs.com/) API running on [Bun](https://bun.sh/), backed by
PostgreSQL via [Drizzle ORM](https://orm.drizzle.team/), with a typed client
generated from the API's own routes.

## What's inside

### Apps

+ `apps/api` — the Elysia HTTP API

### Packages

+ `@repo/api-client` — typed HTTP client, generated from the API
+ `@repo/eslint-config` — shared ESLint config (type-aware, Prettier-integrated)
+ `@repo/typescript-config` — shared `tsconfig.json` bases

### CLI tools

+ `@repo/api-codegen` — generates `@repo/api-client` from the API's routes and
  its `.model.ts` / `.dto.ts` exports

Everything is written in [TypeScript](https://www.typescriptlang.org/).

## Getting started

Install dependencies:

```sh
bun install
```

Start the whole stack in Docker, with hot reload:

```sh
make up
```

| Service | URL | Notes |
| --- | --- | --- |
| API | <http://localhost:8080> | routes are served under `/api` |
| OpenAPI | <http://localhost:8080/api/openapi> | generated from the route definitions |
| Mailpit | <http://localhost:8025> | catches every outbound email in development |
| Postgres | `localhost:5432` | `postgres` / `postgres` |

Redis runs three times, one instance per concern: sessions (6380), jobs (6379)
and cache (6381). They are separate so a flushed cache cannot sign everyone out.
All three start with `make up`, because outside `NODE_ENV=test` the API requires
every one of them and exits at startup if any is missing.

### Optional services

Two services are behind [compose
profiles](https://docs.docker.com/compose/how-tos/profiles/) and stay off by
default. Nothing depends on them, so they are pure opt-in:

| Service | URL | Notes |
| --- | --- | --- |
| `bull_board` | <http://localhost:3001> | background job queues |
| `drizzle_studio` | <https://local.drizzle.studio?host=localhost&port=4983> | browse the database |

```sh
make add s=bull_board       # start one alongside whatever is already running
make drop s=drizzle_studio  # stop and remove one
make services               # list what is running
make run-all                # everything, optional services included
```

`make add` is additive: it reads the running containers and preserves them, so
adding a second optional service does not stop the first.

Drizzle Studio serves a gateway rather than a web page, so port 4983 returns
`404` in a browser — open the `local.drizzle.studio` link above, which connects
back to it. `make db-studio` runs the same thing on the host instead.

## Running locally without Docker

The API needs Postgres, Redis and SMTP. Start the backing services in Docker and
run the API itself on the host:

```sh
docker compose up -d --wait db sessions queue_redis cache mailpit
bun run dev
```

## The generated API client

`packages/api-client/src/generated` is **not committed**. It is produced by
`bun run generate` from the API's route definitions and its `.model.ts` /
`.dto.ts` exports, takes about a second, and needs no database — the codegen
boots the app under `NODE_ENV=test`, where every port resolves to an in-memory
adapter.

You should never need to run it by hand. `generate` is a `dependsOn` of `build`,
`check-types`, `dev`, `lint` and `test` in `turbo.json`, so the client is always
regenerated before anything reads it. A stale client cannot exist, and no pull
request carries a generated diff.

Consume it from another workspace package:

```ts
import { createApiClient } from "@repo/api-client";

const api = createApiClient({ url: "http://localhost:8080" });

const { data, error } = await api.api.auth.signIn.post({
  email: "user@example.com",
  password: "hunter2",
});

if (error) throw new Error(error.message);

console.log(data.userId, data.expiresAt);
```

Route segments are camelCased from the URL (`/api/auth/sign-in` becomes
`api.auth.signIn`), so `url` is the server's origin without the `/api` prefix.
Path parameters are call arguments: `api.api.auth.oauth("google").get()`.

`@repo/api-client/server` exposes `createServerApiClient`, which forwards a
cookie header instead of relying on the browser's cookie jar.

## Database

Migrations live in `apps/api/drizzle` and are managed by Drizzle Kit.

```sh
make db-generate   # generate a migration after changing src/db/schema
make db-migrate    # apply pending migrations
make db-studio     # browse the data
```

Open a psql shell against the running container:

```sh
make db-development
```

## Common tasks

```sh
bun run dev           # run the API in watch mode
bun run build         # build all packages
bun run lint          # eslint, zero warnings allowed
bun run check-types   # tsc --noEmit
bun run test          # bun test
bun run generate      # regenerate the API client
bun run format        # prettier --write
```

`make check` runs lint, types and tests the way CI does. `make services` lists
the running containers; see [optional services](#optional-services) for
`make add` and `make run-all`.

## Tests

```bash
make test              # the suite, against its own Postgres
make test-integration  # also exercises the real Redis, BullMQ and SMTP adapters
make test-down         # remove the containers
```

`make test` starts `docker-compose.test.yml`, which is separate from the
development stack: different containers, different ports, no volumes. A run
cannot reach development data, and nothing it writes survives. `bun test` sets `NODE_ENV=test`,
which makes Bun load `apps/api/.env.test` and every port resolve to its
in-memory adapter, so Redis, SMTP and the OAuth providers are all doubles. The
first run creates the `velo_test` database and migrates it, and each test starts
against empty tables.

`make test-integration` additionally starts Redis and a mail server and runs
the suites in `apps/api/tests/integration`, which drive `RedisSessionStore`,
`RedisCache`, `NazliRateLimitStore`, `BullMqJobQueue` and `SmtpMailer` against
the real thing. They cover what a memory adapter cannot: key layout, TTLs,
BullMQ's scheduler, and what each adapter does when its server disappears.
Without those services they skip rather than fail, so `make test` stays fast.

Unit tests sit next to what they cover, as `*.test.ts`. Tests that go through
HTTP live in `apps/api/tests/`, grouped by area, and use the helpers in
`apps/api/tests/helpers`:

```ts
import { createUser, inbox } from "@tests/helpers";

const user = await createUser({ email: "kate@example.test" });

await user.post("/api/auth/verify-email", {
  token: inbox.tokenFor("kate@example.test"),
});
```

`createUser`, `createVerifiedUser` and `createOAuthUser` return a client that
already carries that user's session, so requests made through it are
authenticated. `createGuest` is the same client with no session. `inbox` reads
what the mailer captured, which is how a test gets at a token that only exists
inside an email. `useOAuthIdentity` decides what the provider double will return
before a flow runs.

## Configuration

Environment variables are validated by a zod schema at startup
(`apps/api/src/configs/env.config.ts`); the process exits with a readable report
if any are missing or malformed. `docker compose` already sets everything needed
for local development.

`DATABASE_URL` is always required. `SESSIONS_REDIS_URL`, `JOBS_REDIS_URL`,
`CACHE_REDIS_URL` and `SMTP_URL` are required unless `NODE_ENV=test`, where
each port falls back to an in-memory adapter so the whole app boots in-process
with no external services.

Behind a proxy, set `TRUSTED_PROXY_HEADER` to the header that proxy sets and
`TRUSTED_PROXY_DEPTH` to how many proxies stand between the client and the API.
Until you do, the client address comes from the socket and forwarded headers are
ignored, because anyone can send them: rate limits keyed by address would
otherwise be defeated by varying the header, and session device information
would record whatever the caller claimed.

OAuth is optional: set `OAUTH_STATE_SECRET` (32+ characters),
`OAUTH_REDIRECT_BASE`, and the client ID and secret for each provider you want
(`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID` /
`GITHUB_CLIENT_SECRET`).

## Code style

Formatting is enforced by Prettier *through* ESLint (`prettier/prettier`), so
`eslint --fix` and format-on-save both repair it. Line width is 80 characters.

The shared config enables type-aware linting and requires explicit
`public` / `private` / `protected` modifiers on all class members. VS Code
settings in `.vscode/` wire format-on-save to the ESLint extension.

## Architecture

`CLAUDE.md` documents the conventions this codebase is built on: the use case
contract, the `modules` / `adapters` / `infrastructure` layering rule, the module
lifecycle hooks, background jobs, and the two caching layers. Read it before
adding a module.
