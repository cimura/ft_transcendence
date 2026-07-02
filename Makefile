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

logs:
	docker compose -f $(COMPOSE_FILE) logs -f

migrate:
	docker compose -f $(COMPOSE_FILE) exec -w /app/backend backend npx prisma migrate dev

.PHONY: all up build down clean fclean re logs
