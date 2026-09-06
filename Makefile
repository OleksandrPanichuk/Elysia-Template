
build:
	docker compose build

logs:
	docker compose logs -f

migrate:
	docker compose exec api bun src/db/migrate.ts

sh:
	docker compose exec api sh

up:
	docker compose up

down:
	docker compose down

DB_URL ?= postgres://postgres:postgres@localhost:5432/postgres

db-development:
	@docker compose up -d --wait db
	@if command -v pgcli >/dev/null 2>&1; then \
		pgcli "$(DB_URL)"; \
	else \
		echo "pgcli not found, falling back to psql (install it with: brew install pgcli)"; \
		docker compose exec -it db psql -U postgres -d postgres; \
	fi

db-shell:
	docker compose exec -it db bash
