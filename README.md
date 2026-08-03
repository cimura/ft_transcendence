*This project has been created as part of the 42 curriculum by sshimura, ryomori, ttakino, rseki, yutakagi.*

# ft_transcendence - Galactic Bomber

## Description

**Galactic Bomber** is a real-time multiplayer Bomberman-style web game built
as the final project of the 42 curriculum. Players can create or join game
rooms, play live matches from separate devices, manage their profiles and
friends, invite friends to games, and track their progress through match
history, rankings, and achievements.

The application uses a server-authoritative game loop: clients send player
input, while the server owns the game state and broadcasts synchronized updates
to connected players. The interface follows an 8-bit galactic visual theme and
supports both keyboard and touch controls.

Key features include:

- Secure email-and-password authentication.
- Real-time lobby, room, invitation, chat, notification, and gameplay updates.
- Two-to-four-player Bomberman matches with reconnect and retirement handling.
- Profile editing, avatar upload, friend requests, and presence indicators.
- Match history, rankings, game statistics, and persistent achievements.
- HTTPS deployment with Docker Compose.

## Team Information

All team members contributed to development in addition to their primary
responsibilities.

| Member | Primary role | Responsibilities |
| --- | --- | --- |
| [@sshimura](https://github.com/cimura) (Shimu) | Product Owner and Developer | Defined the product vision, prioritized the backlog, validated completed work, and coordinated feature integration. |
| [@ryomori](https://github.com/ryomori0113) | Project Manager and Developer | Organized planning and regular meetings, tracked progress and blockers, and coordinated project communication. |
| [@ttakino](https://github.com/taka2162) | Technical Lead and Developer | Defined the technical architecture, made stack decisions, maintained code quality, and reviewed critical changes. |
| [@rseki](https://github.com/rt6500) | Developer | Implemented and tested user-facing account, profile, social, and statistics functionality. |
| [@yutakagi](https://github.com/LaLaSero) | Developer | Implemented and stabilized real-time room, chat, and game-state behavior. |

## Project Management

The team held regular meetings twice a week to review progress, discuss
blockers, refine priorities, and split work into reviewable tasks. GitHub Issues
were used as the backlog and task-tracking system; each issue described the
scope, priority, acceptance conditions, and dependencies where applicable.

Discord was the day-to-day communication channel for quick questions,
coordination, code-review discussion, and meeting follow-up. Work was developed
in branches, reviewed by teammates, and integrated through GitHub pull requests.

## Technical Stack

| Area | Technologies | Why we chose them |
| --- | --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router | Component-based UI, type safety, fast local development, and client-side routing. |
| Styling and 3D rendering | Tailwind CSS, Three.js, React Three Fiber, React Three Drei | Reusable visual primitives and an expressive 3D renderer for the game scene. |
| Client state and HTTP | Zustand, Axios | Lightweight state stores and a consistent API client. |
| Backend | Node.js, NestJS, Express adapter | A modular, testable server architecture with validation, dependency injection, and REST support. |
| Real-time communication | Socket.IO | Authenticated bidirectional events for lobby, rooms, chat, notifications, presence, and game state. |
| Database | PostgreSQL 16, Prisma ORM | Relational integrity for users and match data, plus type-safe database access and migrations. |
| Authentication and validation | JWT, Passport, bcrypt, class-validator | Password hashing, authenticated API access, and validated client input. |
| File uploads | Multer, Docker volume | Validated avatar uploads stored persistently outside the application container. |
| Deployment | Docker Compose, nginx, self-signed TLS certificate | One-command local deployment and HTTPS as the public entry point. |
| Quality | Jest, ESLint, Prettier, GitHub Actions | Automated tests, static checks, formatting checks, and CI for frontend and backend changes. |

## Database Schema

PostgreSQL is managed through Prisma migrations. The following description is
the current logical schema; a separate ER diagram is intentionally omitted.

| Table / model | Key fields | Relationships |
| --- | --- | --- |
| `User` | `id` UUID string, unique `email`, unique `username`, `passwordHash`, optional `avatarUrl`, timestamps | Sends and receives `Friendship` records, participates in matches through `MatchParticipant`, and owns `UserAchievement` records. |
| `Friendship` | `id` UUID string, `requesterId`, `receiverId`, unique `pairKey`, `status` enum (`PENDING`, `ACCEPTED`), timestamps | Many friendship requests belong to two `User` records: requester and receiver. The requester/receiver pair is unique. |
| `UploadedImage` | `id` UUID string, original and stored filenames, MIME type, byte size, URL, creation timestamp | Stores upload metadata. A user's `avatarUrl` refers to the stored URL; this is deliberately a URL reference rather than a database foreign key. |
| `Match` | `id` UUID string, `gameType`, `finishedAt`, `createdAt` | Has one or more `MatchParticipant` records. |
| `MatchParticipant` | `id` UUID string, `matchId`, `userId`, `result` enum (`WIN`, `LOSS`, `DRAW`), optional `kills`, `score`, and `rank` | Join model between `Match` and `User`; each user can appear only once in a match. |
| `UserAchievement` | composite key `userId` and `achievementId`, `unlockedAt` | Belongs to a `User`. Achievement definitions are maintained in application code, so `achievementId` is not a foreign key to a separate table. |

## Features List

| Feature | Functionality | Contributors |
| --- | --- | --- |
| Authentication | Sign up and sign in with email and password; bcrypt hashing and JWT-protected requests. | @ttakino, @rseki, @sshimura |
| Profiles and avatars | View and edit profiles, select a default avatar, upload validated avatar images, and manage account details. | @rseki, @ryomori |
| Friends and presence | Search users, send and manage friend requests, remove friends, and display online, in-game, or offline presence. | @rseki, @sshimura |
| Lobby and invitations | Create, browse, join, leave, and manage rooms; invite eligible friends to a room. | @ttakino, @sshimura, @rseki |
| Real-time Bomberman | Run synchronized two-to-four-player matches with server-owned state, disconnect/reconnect handling, retirement, and touch or keyboard input. | @ttakino, @yutakagi, @sshimura |
| Room chat | Send and receive messages within a game room through Socket.IO event handlers. | @yutakagi, @ttakino |
| Notifications | Receive and view in-application notifications for friend requests and game invitations. | @sshimura, @ttakino |
| Scores and progression | Persist match results, show history and rankings, calculate statistics, and unlock Galactic Guide achievements. | @rseki, @ttakino |
| Design system | Deliver the galactic pixel-art visual language across the home, lobby, room, profile, friend, and settings screens. | @ryomori, @rseki |
| Delivery and quality | Provide Docker-based HTTPS deployment, formatting and lint checks, automated backend tests, and GitHub Actions workflows. | @ttakino, @rseki, @sshimura |

## Modules

The selected modules total **14 points**. A module is claimed only through the
functionality described below and demonstrated in the running application.

| Category | Module | Type | Points | Implementation and contributors |
| --- | --- | --- | ---: | --- |
| Web | Frameworks for frontend and backend | Major | 2 | React frontend and NestJS backend provide the project structure, routing, validation, and API layers. Contributors: all team members. |
| Web | Real-time features | Major | 2 | Socket.IO broadcasts authenticated lobby, room, presence, notification, and game updates, with connection and reconnection handling. Contributors: @ttakino, @yutakagi, @sshimura. |
| Web | User interaction | Major | 2 | Users can access profiles, manage friends, and exchange messages in game rooms. Contributors: @rseki, @yutakagi, @ttakino. |
| Gaming and user experience | Complete web-based game | Major | 2 | A live Bomberman-style game with clear elimination and ranking outcomes is rendered in the browser from server-owned state. Contributors: @ttakino, @yutakagi, @sshimura. |
| Gaming and user experience | Remote players | Major | 2 | Players on separate devices can join the same room, receive synchronized state, and recover from temporary disconnections. Contributors: @ttakino, @yutakagi. |
| User management | Standard user management and authentication | Major | 2 | Users can authenticate, edit profiles, upload or select avatars, add friends, view profiles, and see presence state. Contributors: @rseki, @ttakino. |
| Web | Notification system | Minor | 1 | The application delivers and displays real-time in-app friend-request and game-invitation notifications. Contributors: @sshimura, @ttakino. |
| User management | Game statistics and match history | Minor | 1 | Match results are persisted and exposed through personal history, rankings, statistics, and achievement progression. Contributors: @rseki, @ttakino. |
|  | **Total** |  | **14** |  |

## Instructions

### Prerequisites

- Docker
- Docker Compose

Check the installed versions with:

```bash
docker --version
docker compose version
```

### Configure environment variables

Create your local environment file from the provided example:

```bash
cp .env.example .env
```

| Variable | Purpose |
| --- | --- |
| `JWT_SECRET` | Secret used to sign and verify JSON Web Tokens. |
| `JWT_EXPIRES_IN` | JWT lifetime, for example `1d` or `60s`. |
| `DATABASE_URL` | PostgreSQL connection URL used by Prisma. |
| `POSTGRES_USER` | PostgreSQL user name. |
| `POSTGRES_PASSWORD` | PostgreSQL password. |
| `POSTGRES_DB` | PostgreSQL database name. |

Never commit `.env`; it contains local secrets.

### Build and start

Start the application for the first time, or rebuild images after dependency or
Dockerfile changes:

```bash
make build
```

For later starts, use:

```bash
make
```

After the containers are running, apply the committed Prisma migrations:

```bash
make migrate
```

This deployment-safe command applies existing migrations without creating new
ones. Run it after first startup, after recreating the PostgreSQL volume, or
after pulling new migrations.

### Access the application

- Application: <https://localhost:8443>
- API and Swagger UI: <https://localhost:8443/api/>
- Privacy Policy: <https://localhost:8443/legal/privacy-policy>
- Terms of Service: <https://localhost:8443/legal/terms-of-service>

nginx is the public HTTPS entry point. The local certificate is self-signed, so
your browser will show a security warning that must be accepted for local use.

You can verify the HTTPS endpoints from a terminal:

```bash
curl -kfsS -o /dev/null https://localhost:8443
curl -kfsS https://localhost:8443/api/
```

### Useful commands

```bash
make logs       # Follow container logs
make down       # Stop containers
make rebuild    # Rebuild and recreate containers
```

To check Prisma migration status:

```bash
docker compose -f docker/docker-compose.yml exec -w /app/backend backend npm run prisma:migrate:status
```

To run backend formatting checks:

```bash
docker compose -f docker/docker-compose.yml exec backend npm run format:check
```

## Individual Contributions

### @sshimura - Product Owner and Developer

- Maintained product direction, prioritization, integration, and feature validation.
- Implemented notification delivery and presentation, game invitations, socket namespace separation, and related room behavior.
- Contributed to authentication integration, security configuration, CI fixes, and review follow-up.

### @ryomori - Project Manager and Developer

- Coordinated planning, progress tracking, meetings, and team communication.
- Designed and implemented key visual screens and flows for the home, lobby, waiting room, settings, and friend interfaces.
- Helped keep the pixel-art galactic UI consistent across user-facing features.

### @ttakino - Technical Lead and Developer

- Defined the React/NestJS/Prisma/Socket.IO architecture and maintained shared real-time contracts.
- Implemented and stabilized the server-authoritative game loop, rooms, connection recovery, countdown, rankings, and game rendering integration.
- Led technical refactoring, test improvements, build and CI maintenance, and critical code review.

### @rseki - Developer

- Implemented profile retrieval and editing, avatar upload and validation, friend management, and responsive profile/settings UI.
- Implemented match-result persistence, rankings, user statistics, achievements, and Galactic Guide progression.
- Added legal pages, tests, API connections, Docker fixes, and user-facing error handling.

### @yutakagi - Developer

- Implemented room-chat Socket.IO handlers, chat history delivery, and serialized chat event processing.
- Contributed to countdown state handling and real-time room/game behavior fixes.
- Supported integration and review work around game state and room lifecycle behavior.

## Resources

- [React documentation](https://react.dev/)
- [NestJS documentation](https://docs.nestjs.com/)
- [Socket.IO documentation](https://socket.io/docs/v4/)
- [Prisma documentation](https://www.prisma.io/docs/)
- [PostgreSQL documentation](https://www.postgresql.org/docs/)
- [Docker Compose documentation](https://docs.docker.com/compose/)
- [Three.js documentation](https://threejs.org/docs/)

### AI usage

AI was used to prepare initial drafts of the Privacy Policy and Terms of Service
pages, and to organize the README requirements and documentation structure. The
team reviewed, corrected, and took responsibility for the final legal text,
technical descriptions, and implementation decisions. AI-generated output was
not accepted without human review.
