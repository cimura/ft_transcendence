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
| KEY             | DESCRIPTION                                                                               |
| :--:            | :--:                                                                                      |
| JWT_SECRET      | A secure, random cryptographic string used to sign and verify JSON Web Tokens.            |
| JWT_EXPIRES_IN  | The validity duration of the issued token (e.g., `1d` for one day, `60s` for 60 seconds). |

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
https://localhost:8443
```

### Backend through Nginx

```text
https://localhost:8443/api/
```

Beause the local HTTPS certificate is self-signed, the browser may show a security warning.

### How to test with curl

```bash
curl -kI https://localhost:8443
curl -k https://localhost:8443/api/
```
