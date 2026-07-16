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

## Services
This project currently starts four services:

- frontend: frontend development server
- backend: NestJS backend server
- nginx: HTTPS reverse proxy
- postgres: PostgreSQL database used through Prisma

Nginx is the public entry point for the application.

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

The first startup may take some time because Docker needs to build images and install dependencies.

After the containers are running, apply the Prisma migrations to the local PostgreSQL database:

```bash
make migrate
```

This is needed after the first startup, after recreating the database volume, or after pulling new Prisma migrations from Git.

## Access URLs

### Frontend through Nginx

```text
https://localhost:8443
```

### Backend through Nginx

```text
https://localhost:8443/api/
```

Because the local HTTPS certificate is self-signed, the browser may show a security warning.

### How to test with curl

```bash
curl -kI https://localhost:8443
curl -k https://localhost:8443/api/
```

### Prisma

The generated Prisma Client is not committed to Git.
It is generated automatically when the backend container starts:

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
make migrate
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
