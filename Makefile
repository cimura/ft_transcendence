COMPOSE_FILE = docker/docker-compose.prod.yml
COMPOSE_DEV_FILE = docker/docker-compose.yml

# === ビルドと起動(本番用: 単一コマンドでの起動が要件のためこちらをメインにする) ===

all: up

# .env は手動で作成する。自動コピーするとプレースホルダーのまま起動できてしまうため。
check-env:
	@test -f .env || { \
		echo "Error: .env not found."; \
		echo "Run 'cp .env.example .env' and fill in the required values (JWT_SECRET etc.)."; \
		exit 1; \
	}

# compose を構築するターゲットは .env がないと失敗する(down/logs 系は不要)
up build rebuild rebuild-clean dev-up dev-build dev-rebuild dev-rebuild-clean dev-migrate: check-env

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

rebuild:
	docker compose -f $(COMPOSE_FILE) up --build --force-recreate -d

rebuild-clean:
	docker compose -f $(COMPOSE_FILE) up --build --force-recreate -V -d

logs:
	docker compose -f $(COMPOSE_FILE) logs -f

# === 開発用(ホットリロード付き。本番用とポート8443を共有するため同時起動不可) ===

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

.PHONY: all check-env up build down clean fclean re rebuild rebuild-clean logs \
	dev-up dev-build dev-down dev-clean dev-fclean dev-re dev-rebuild dev-rebuild-clean dev-logs dev-migrate
