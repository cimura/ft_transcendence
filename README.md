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

## Services
This project currently starts three services:

- frontend: frontend development server
- backend: NestJS backend server
- nginx: HTTPS reverse proxy

Nginx is the public entry point for the application.
The backend uses NestJS. NestJS uses Express as its default HTTP platform adapter, so the current backend stack is Node.js + NestJS + Express adapter.

## Start the containers

```bash
make
```

or

```bash
make build
```

The first startup may take some time because Docker needs to build imanges and install dependencies.

## Access URLs

### Frontend through Nginx

```text
https://localhost/
```

### Backend through Nginx

```text
https://localhost/api/
```

Beause the local HTTPS certificate is self-signed, the browser may show a security warning.

### How to test with curl

```bash
curl -kI https://localhost/
curl -k https://localhost/api/
```

The backend is reachable directly by:

```bash
curl http://localhost:3000/api/
```



