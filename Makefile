COMPOSE_FILE = docker/docker-compose.prod.yml
COMPOSE_DEV_FILE = docker/docker-compose.yml

# === ビルドと起動 ===

all: up

check-env:
	@test -f .env || { \
		echo "Error: .env not found."; \
		echo "Run 'cp .env.example .env' and fill in the required values (JWT_SECRET etc.)."; \
		exit 1; \
	}

up build rebuild rebuild-clean dev-up dev-build dev-rebuild dev-rebuild-clean dev-migrate: check-env

up:
	docker compose -f $(COMPOSE_FILE) up -d

build:
	docker compose -f $(COMPOSE_FILE) up --build -d

down:
	docker compose -f $(COMPOSE_FILE) down

clean:
	docker compose -f $(COMPOSE_FILE) down -v

fclean:
	docker compose -f $(COMPOSE_FILE) down --rmi local -v --remove-orphans

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

dev-fclean:
	docker compose -f $(COMPOSE_DEV_FILE) down --rmi local -v --remove-orphans

dev-re: dev-fclean dev-build

dev-rebuild:
	docker compose -f $(COMPOSE_DEV_FILE) up --build --force-recreate -d

dev-rebuild-clean:
	docker compose -f $(COMPOSE_DEV_FILE) up --build --force-recreate -V -d

dev-logs:
	docker compose -f $(COMPOSE_DEV_FILE) logs -f

dev-migrate:
	docker compose -f $(COMPOSE_DEV_FILE) exec -w /app/backend backend npm run prisma:migrate:dev

.PHONY: all check-env up build down clean fclean re rebuild rebuild-clean logs \
	dev-up dev-build dev-down dev-clean dev-fclean dev-re dev-rebuild dev-rebuild-clean dev-logs dev-migrate
