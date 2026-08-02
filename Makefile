COMPOSE_FILE = docker/docker-compose.yml

# === ビルドと起動 ===

all: up

.env:
	cp .env.example .env

# compose モデルを構築するターゲットは .env がないと失敗する(down/logs 系は不要)
up build rebuild rebuild-clean migrate: .env

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
	docker compose -f $(COMPOSE_FILE) exec -w /app/backend backend npm run prisma:migrate:dev

.PHONY: all up build down clean fclean re logs rebuild rebuild-clean
