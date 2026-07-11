COMPOSE_FILE = docker/docker-compose.yml

# === ビルドと起動 ===

all: up

up:
	docker compose -f $(COMPOSE_FILE) up -d

build:
	docker compose -f $(COMPOSE_FILE) up --build -d

down:
	docker compose -f $(COMPOSE_FILE) down

# === クリーンアップ ===

clean:
	docker compose -f $(COMPOSE_FILE) down -v

fclean: clean
	docker system prune -af --volumes

re: fclean build

# === 開発用 ===

rebuild:
	docker compose -f $(COMPOSE_FILE) up --build --force-recreate -d

rebuild-clean:
	docker compose -f $(COMPOSE_FILE) up --build --force-recreate -V -d

logs:
	docker compose -f $(COMPOSE_FILE) logs -f

migrate:
	docker compose -f $(COMPOSE_FILE) exec -w /app/backend backend npx prisma migrate dev


# === format check and test ===
frontend-build:
	npm run build -w frontend

frontend-format-check:
	npm run format:check -w frontend

backend-format-check:
	docker compose -f $(COMPOSE_FILE) exec -w /app/backend backend npm run format:check

backend-test:
	docker compose -f $(COMPOSE_FILE) exec -w /app/backend backend npm test

format-check: frontend-format-check backend-format-check

.PHONY: all up build down clean fclean re logs rebuild rebuild-clean migrate \
	frontend-build frontend-format-check \
	backend-format-check backend-test \
	format-check
