# ft_transcendence

## Development setup

### Requirements

- Docker
- Docker Compose
- Docker Buildx 0.17 or later

You can check your versions with:

```bash
docker --version
docker compose version
docker buildx version
```

### Environment variables setup
The application relies on environment variables to securely manage sensitive configurations, such as authentication keys, without hardcoding them into the source code. 

You can easily set up the default environment variables by copying the provided example file. Run the following command in your project root:

```bash
cp .env.example .env
```

**Variables Description**:
| KEY               | DESCRIPTION                                                                               |
| :--              | :--                                                                                      |
| JWT_SECRET        | A secure, random cryptographic string used to sign and verify JSON Web Tokens.            |
| JWT_EXPIRES_IN    | The validity duration of the issued token (e.g., `1d` for one day, `60s` for 60 seconds). |
| DATABASE_URL      | PostgreSQL connection URL used by Prisma.                                                 |
| POSTGRES_USER     | The user of PostgreSQL.                                                                   |
| POSTGRES_PASSWORD | The password of PostgreSQL.                                                               |
| POSTGRES_DB       | The name of PostgreSQL.                                                                   |
| SOCKET_IO_CORS_ORIGIN | Comma-separated origins allowed to connect to the Socket.IO namespaces.               |
| VITE_USE_POLLING  | Set to `true` to make the Vite dev server poll for file changes. Only needed when hot reload does not react to edits (e.g. the repository lives on a Windows/macOS filesystem mounted into Docker). Polling consumes CPU continuously, so keep it `false` otherwise. |

## Services
`make` (no argument, or any plain target such as `make build`) starts the **production** stack, defined in `docker/docker-compose.prod.yml`. It has three services:

- nginx: HTTPS reverse proxy that also serves the frontend's built static files directly (no separate frontend container)
- backend: NestJS backend server, running the compiled build (no hot reload)
- postgres: PostgreSQL database used through Prisma

Nginx is the public entry point for the application. Prisma migrations are applied automatically when the backend container starts, so no manual migration step is needed here.

For day-to-day development with hot reload, use the `dev-*` targets instead (see [Development mode](#development-mode) below), which run `docker/docker-compose.yml` and add a fourth `frontend` service (a Vite dev server).

The backend uses NestJS. NestJS uses Express as its default HTTP platform adapter, so the current backend stack is Node.js + NestJS + Express adapter.

The database stack is PostgreSQL + Prisma ORM.

## Start the containers

```bash
make
```

or

```bash
make build
```

The first startup may take some time because Docker needs to build images and install dependencies. This is the production stack — see [Production build](#production-build) for how it differs from development, and [Development mode](#development-mode) if you want hot reload instead.

## Access URLs

### Frontend through Nginx

```text
https://localhost:8443
```

### Backend through Nginx

```text
https://localhost:8443/api/
```

### Legal pages

- [Privacy Policy](https://localhost:8443/legal/privacy-policy)
- [Terms of Service](https://localhost:8443/legal/terms-of-service)

Because the local HTTPS certificate is self-signed, the browser may show a security warning.

### How to test with curl

```bash
curl -kI https://localhost:8443
curl -k https://localhost:8443/api/
```

## Production build

`docker/docker-compose.prod.yml` (the target of the plain `make` commands above) builds self-contained production images:

- The frontend is compiled with `vite build` and the static `dist/` output is copied into the `nginx` image (`docker/nginx/Dockerfile.prod`), which also serves as the SPA (client-side routing fallback to `index.html`). There is no separate frontend container.
- `docker/backend/Dockerfile.prod` compiles the backend with `nest build` and runs the compiled `dist/main.js` with `node` directly (no `nest --watch`, no devDependencies in the final image).
- Prisma migrations are applied automatically on backend startup (`prisma migrate deploy`), so there is no dedicated migrate target for production.
- Swagger UI (`/api`) is disabled in production (`NODE_ENV=production`), since it would otherwise expose the full API schema publicly.

### Before deploying

Set real values in `.env` before deploying, especially `JWT_SECRET` — nothing checks this automatically, so make sure it isn't left as the `.env.example` placeholder. If you deploy behind a real domain, replace the self-signed certificate generated in `docker/nginx/Dockerfile.prod` with a real one (e.g. mount it instead of generating it at build time).

## Development mode

For hot reload during development, use the `dev-*` Makefile targets instead, which run `docker/docker-compose.yml` (bind-mounts the source tree, runs `vite` dev server and `nest start --watch`):

```bash
make dev-build
```

Development listens on the same port (8443) as production, so only one of the two stacks can run at a time — stop whichever is running first (`make down` or `make dev-down`).

Other targets: `make dev-up`, `make dev-logs`, `make dev-down`, `make dev-clean` / `make dev-fclean` (also remove volumes), `make dev-rebuild`, `make dev-rebuild-clean`.

After the dev containers are running, apply Prisma migrations to the local database:

```bash
make dev-migrate
```

This is needed after the first startup, after recreating the database volume, or after pulling new Prisma migrations from Git.

### Prisma

The generated Prisma Client is not committed to Git.
In development it is generated automatically when the backend container starts:

```bash
npm run start:dev
```

If needed, generate it manually:

```bash
docker compose -f docker/docker-compose.yml exec -w /app/backend backend npm run prisma:generate
```

To check the migration status:

```bash
docker compose -f docker/docker-compose.yml exec -w /app/backend backend npm run prisma:migrate:status
```

To apply development migrations manually:

```bash
make dev-migrate
```

or

```bash
docker compose -f docker/docker-compose.yml exec -w /app/backend backend npm run prisma:migrate:dev
```

## Code formatting

Backend code is formatted with Prettier.

To check formatting:

```bash
docker compose -f docker/docker-compose.yml exec backend npm run format:check
```

To apply formatting:

```bash
docker compose -f docker/docker-compose.yml exec backend npm run format
```

The backend has its own .prettierignore file because Prettier is executed inside the backend container. Generated Prisma files under src/generated/ are excluded from formatting.
