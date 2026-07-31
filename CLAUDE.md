# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

ft_transcendence: a real-time multiplayer game platform (42 school project). npm workspaces monorepo with three packages: `backend` (NestJS API + WebSocket gateways), `frontend` (React 19 + Vite SPA), and `shared` (TypeScript types shared across the socket.io contract between them, imported as raw `.ts` — no build step).

## Commands

### Running the stack

The project runs via Docker Compose (`docker/docker-compose.yml`, services: `frontend`, `backend`, `nginx`, `postgres`). Nginx is the entry point.

```bash
cp .env.example .env   # first-time setup
make                   # docker compose up -d
make build             # up --build -d (rebuild images)
make migrate           # apply Prisma dev migrations inside the backend container
make logs              # follow all container logs
make rebuild           # up --build --force-recreate -d
make down / make clean # stop / stop + remove volumes
```

App: `https://localhost:8443` (self-signed cert). API: `https://localhost:8443/api/`. Swagger is mounted at `/api` on the backend itself.

### Backend (`backend/`)

```bash
npm run start:dev          # prisma generate + nest start --watch
npm run test               # jest unit tests (*.spec.ts, colocated with source)
npm run test -- <pattern>  # run a subset, e.g. npm run test -- rooms.service
npm run test:e2e           # e2e tests under backend/test/*.e2e-spec.ts
npm run test:cov
npm run lint               # eslint --fix
npm run format / format:check
```

Prisma commands are run with `--config=prisma.config.ts` (schema lives at `backend/prisma/schema.prisma`, generated client output is `backend/src/generated/prisma`, not committed and excluded from formatting/lint). Prefer `make migrate` for applying migrations; use `npm run prisma:migrate:dev` directly only when working outside Docker.

Since these commands run inside the container, prefix with `docker compose -f docker/docker-compose.yml exec backend ...` (or `exec -w /app/backend backend ...` for npm scripts) when the stack is already up, per the README.

### Frontend (`frontend/`)

```bash
npm run dev             # vite dev server
npm run build           # tsc -b && vite build
npm run lint
npm run format / format:check
```

No frontend test runner is configured.

## Architecture

### Monorepo layout

- `backend/` — NestJS (Express adapter) API + Socket.IO gateways.
- `frontend/` — React 19 + Vite + Tailwind v4, react-router-dom v7, Zustand stores, socket.io-client.
- `shared/` — pure `.ts` type declarations (`game-events.types.ts`, `rooms-events.types.ts`) imported by both sides as `@ft_transcendence/shared/...` via workspace linking. No compiled output is consumed; edit these when changing any socket event payload shape so both ends stay in sync.

### Persistence: what's in Postgres vs. what's in memory

This is the most important thing to know before touching rooms or game code, because the project is mid-migration (see recent commits like "room管理をインメモリに変換中"): **room and live-game state used to live in Postgres and now lives entirely in an in-process `Map`.**

- `RoomsStateService` (`backend/src/rooms/rooms-state.service.ts`) holds all `Room` objects (including nested `participants` and, during a match, the live `gameSession`) in a single `Map<string, Room>` — no DB table backs it. `RoomsService` mutates rooms through this service instead of Prisma.
- Prisma (`backend/prisma/schema.prisma`) still owns everything that must survive process restarts / be queried relationally: `User`, `Friendship`, `Match` + `MatchParticipant` (match history/ranking), `RoomMessage` (chat history), `RoomInvitation`. There is **no `Room` model in the schema anymore** — it was removed when room state moved in-memory.
- Practical implication: room/game state does not survive a backend restart, and there's no multi-instance backend support (state isn't shared across processes) — anything that assumes rooms persist across a restart or a horizontal scale-out is a regression from the old DB-backed behavior.
- A consequence of the in-memory model (intentional, not a bug): because the live `Room` object can carry a `gameSession`, the game layer can read the player's `username` directly off the room's participants — something the old DB-only design couldn't do mid-match.

### Rooms vs. Games vs. Game — three similarly-named things

- `backend/src/games/` (plural) — a static, hardcoded catalog of playable games (e.g. `BOMBERMAN_GAME_ID` in `games.constants.ts`) with supported player counts. Just a lookup service; not user data.
- `backend/src/rooms/` — the lobby/matchmaking layer: create/join/leave/ready/start a room, chat (`rooms-chat.service.ts`, persisted via `RoomMessage`), invitations (`rooms-invitation.service.ts`, persisted via `RoomInvitation`), and the in-memory state described above. Exposes both a REST controller and a Socket.IO gateway (`rooms.gateway.ts`) for live lobby updates.
- `backend/src/game/` (singular) — the actual real-time gameplay engine once a room starts: `game.gateway.ts` (Socket.IO namespace `/game`, handles `game:join`/`player:input`/`bomb:place`), `game.service.ts`, and `logic/` split into `core` (game loop), `mechanics` (movement, bombs), `setup` (map generation), and `session` (player lifecycle, timeouts, end-of-match). The gateway looks up the room via the shared `RoomsStateService` (imported through `RoomsModule`'s export) rather than owning its own room data.

### WebSocket cross-cutting concerns

`backend/src/websocket/` holds infrastructure shared by both the `rooms` and `game` gateways rather than being owned by either:
- `socket-auth.service.ts` — verifies the JWT passed in `handshake.auth.token` (same JWT used for REST auth) since Socket.IO connections can't use the Nest HTTP guard pipeline.
- `socket-presence.service.ts` — tracks which socket IDs are attached to which (namespace, room, user), so a user with multiple tabs/reconnects isn't treated as "left" until their last socket disconnects.
- `socket-cors.ts` — shared CORS origin resolution for both gateway namespaces.

### Auth

Passport JWT strategy (`backend/src/auth/`) issues/verifies bearer tokens for REST (via `JwtAuthGuard`) and the same tokens are re-verified manually for sockets via `SocketAuthService` above — there is no session/cookie auth.

### Frontend state

Zustand stores in `frontend/src/stores/` (`authStore`, `roomStore`, `gameStore`, `friendStore`, `notificationStore`) hold client-side state; `frontend/src/hooks/` wraps socket.io-client connections (`useRoomSocket`, `useGameSocket`, `useRoomChat`) and input handling (`useInputManager`, `useGameInput`) on top of those stores. `frontend/src/api/` holds the Axios REST client wrappers, one file per backend resource.
