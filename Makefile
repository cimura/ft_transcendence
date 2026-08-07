COMPOSE_FILE = docker/docker-compose.prod.yml
COMPOSE_DEV_FILE = docker/docker-compose.yml

# === ビルドと起動 ===

all: up

.env:
	cp .env.example .env

up build rebuild rebuild-clean dev-up dev-build dev-rebuild dev-rebuild-clean dev-migrate: .env

up:
	docker compose -f $(COMPOSE_FILE) up -d

build:
	docker compose -f $(COMPOSE_FILE) up --build -d

down:
	docker compose -f $(COMPOSE_FILE) down

clean:
	docker compose -f $(COMPOSE_FILE) down -v

fclean: clean
	docker system prune -af --volumes

re: fclean build

rebuild:
	docker compose -f $(COMPOSE_FILE) up --build --force-recreate -d

rebuild-clean:
	docker compose -f $(COMPOSE_FILE) up --build --force-recreate -V -d

logs:
	docker compose -f $(COMPOSE_FILE) logs -f

# === 開発用 ===

dev-up:
	docker compose -f $(COMPOSE_DEV_FILE) up -d

dev-build:
	docker compose -f $(COMPOSE_DEV_FILE) up --build -d

dev-down:
	docker compose -f $(COMPOSE_DEV_FILE) down

dev-clean:
	docker compose -f $(COMPOSE_DEV_FILE) down -v

dev-fclean: dev-clean
	docker system prune -af --volumes

dev-re: dev-fclean dev-build

dev-rebuild:
	docker compose -f $(COMPOSE_DEV_FILE) up --build --force-recreate -d

dev-rebuild-clean:
	docker compose -f $(COMPOSE_DEV_FILE) up --build --force-recreate -V -d

dev-logs:
	docker compose -f $(COMPOSE_DEV_FILE) logs -f

dev-migrate:
	docker compose -f $(COMPOSE_DEV_FILE) exec -w /app/backend backend npm run prisma:migrate:dev

dev-deps:
	docker run --rm -v $(CURDIR):/app -w /app -e npm_config_cache=/app/.npm-cache \
  node:24-alpine npm ci --workspace=frontend --workspace=shared

dev-e2e:
	docker run --rm --network host -v $(CURDIR):/app -w /app/frontend -e HOME=/tmp -e CI=1 \
		mcr.microsoft.com/playwright:v1.62.1-noble \
		npx playwright test

.PHONY: all up build down clean fclean re rebuild rebuild-clean logs \
	dev-up dev-build dev-down dev-clean dev-fclean dev-re dev-rebuild dev-rebuild-clean dev-logs dev-migrate dev-deps
