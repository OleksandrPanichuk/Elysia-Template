# api

A [Turborepo](https://turborepo.dev/) monorepo containing an
[Elysia](https://elysiajs.com/) API running on [Bun](https://bun.sh/), backed by
PostgreSQL via [Drizzle ORM](https://orm.drizzle.team/).

## What's inside

### Apps

+ `apps/api` — the Elysia HTTP API

### Packages

+ `@repo/eslint-config` — shared ESLint config (type-aware, Prettier-integrated)
+ `@repo/typescript-config` — shared `tsconfig.json` bases

Everything is written in [TypeScript](https://www.typescriptlang.org/).

## Getting started

Install dependencies:

```sh
bun install
```

Start PostgreSQL and the API in Docker, with hot reload:

```sh
make up
```

The API listens on <http://localhost:8080> and Postgres on port 5432.

## Running locally without Docker

Start only the database, then run the API on the host:

```sh
docker compose up -d db
bun run dev
```

## Database

Migrations live in `apps/api/drizzle` and are managed by Drizzle Kit.

```sh
# generate a migration after changing src/db/schema
bun run --cwd apps/api db:generate

# apply pending migrations
bun run --cwd apps/api db:migrate

# browse the data
bun run --cwd apps/api db:studio
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
bun run format        # prettier --write
```

## Code style

Formatting is enforced by Prettier *through* ESLint (`prettier/prettier`), so
`eslint --fix` and format-on-save both repair it. Line width is 80 characters.

The shared config enables type-aware linting and requires explicit
`public` / `private` / `protected` modifiers on all class members. VS Code
settings in `.vscode/` wire format-on-save to the ESLint extension.

> Note: `@repo/eslint-config` pins TypeScript 6 locally because
> `typescript-eslint` does not yet support the TypeScript 7 API. The workspace
> compiler stays on TypeScript 7.
