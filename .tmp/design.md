# ft_transcendence - CI/CD, Test, Lint Setup Design

## Overview

ft_transcendenceプロジェクトのフロントエンド（優先）とバックエンドのCI/CD、テスト、リント環境を整備する。

## Technology Stack

### Frontend
- **Framework**: React + React Three Fiber (R3F)
- **Language**: TypeScript
- **Use Cases**:
  - React: 2D UI (login, profile, search screens)
  - R3F: 3D rendering (corridor, home screen)

### Backend
- **Framework**: NestJS
- **Runtime**: Node.js
- **Language**: TypeScript
- **Features**: Real-time communication (socket.io for syncing footsteps, etc.)

### Shared
- **Language**: TypeScript (type sharing between frontend and backend)

## Project Structure

```
ft_transcendence/
├── frontend/              # React + R3F frontend application
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts    # Vite for build tool
│   ├── vitest.config.ts  # Vitest for testing
│   ├── .eslintrc.json
│   └── .prettierrc.json
├── backend/               # NestJS backend application
│   ├── src/
│   ├── test/
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── jest.config.js    # Jest for testing (NestJS default)
│   ├── .eslintrc.js
│   └── .prettierrc
├── shared/                # Shared TypeScript types
│   ├── src/
│   └── tsconfig.json
├── .github/
│   └── workflows/
│       ├── frontend-ci.yml
│       └── backend-ci.yml
├── docker-compose.yml     # For local development
└── README.md
```

## Requirements - Frontend (Priority)

### 1. Linting & Formatting

#### ESLint
- **Purpose**: Code quality and consistency
- **Configuration**:
  - Base: `@typescript-eslint/recommended`
  - React: `eslint-plugin-react`, `eslint-plugin-react-hooks`
  - Import sorting: `eslint-plugin-import`
  - React Three Fiber specific rules if needed
- **Rules**:
  - Enforce TypeScript strict mode
  - React Hooks rules
  - Unused variables/imports detection
  - Consistent code style

#### Prettier
- **Purpose**: Code formatting
- **Configuration**:
  - Single quotes
  - Semicolons
  - Trailing commas
  - Line width: 100
  - Tab width: 2
- **Integration**: ESLint integration with `eslint-config-prettier`

### 2. Testing

#### Vitest
- **Purpose**: Unit testing and component testing
- **Configuration**:
  - Test files: `**/*.{test,spec}.{ts,tsx}`
  - Coverage: Istanbul/v8
  - Environment: jsdom for React components
- **Testing Libraries**:
  - `@testing-library/react`: React component testing
  - `@testing-library/user-event`: User interaction simulation
  - `@testing-library/jest-dom`: Custom matchers

#### Test Coverage Goals
- Minimum: 70% coverage
- Critical paths: 90%+ coverage

### 3. CI/CD Pipeline

#### GitHub Actions - Frontend CI

**Trigger Events**:
- Push to `main`, `develop` branches
- Pull requests to `main`, `develop`

**Jobs**:

1. **Lint Job**
   - Run ESLint
   - Run Prettier check
   - Fail on warnings

2. **Type Check Job**
   - Run TypeScript compiler (`tsc --noEmit`)

3. **Test Job**
   - Run Vitest
   - Generate coverage report
   - Upload coverage to Codecov (optional)

4. **Build Job**
   - Build with Vite
   - Check build artifacts
   - Cache dependencies

**Optimization**:
- Parallel job execution
- Dependency caching (pnpm/npm cache)
- Matrix strategy for multiple Node.js versions (optional)

### 4. Pre-commit Hooks (Optional but Recommended)

#### Husky + lint-staged
- **Pre-commit**:
  - Run ESLint on staged files
  - Run Prettier on staged files
  - Run type check on staged files
- **Pre-push**:
  - Run tests related to changed files

### 5. Development Tools

#### Package Manager
- **Recommended**: pnpm (faster, disk space efficient)
- **Alternative**: npm or yarn

#### Build Tool
- **Vite**: Fast HMR, optimized for React

#### TypeScript Configuration
- Strict mode enabled
- Path aliases for cleaner imports
- Shared types from `shared/` package

## Requirements - Backend (Future)

### 1. Linting & Formatting
- ESLint with NestJS recommended config
- Prettier (same config as frontend)

### 2. Testing
- Jest (NestJS default)
- Supertest for E2E testing
- Coverage goals: 80%+

### 3. CI/CD
- Similar structure to frontend
- Additional: Database migration checks
- Socket.io connection tests

## Implementation Steps

### Phase 1: Frontend Setup (Priority)
1. Initialize frontend project with Vite + React + TypeScript
2. Install and configure ESLint
3. Install and configure Prettier
4. Install and configure Vitest + Testing Library
5. Create GitHub Actions workflow for frontend CI
6. Set up pre-commit hooks (optional)
7. Create sample tests to verify setup

### Phase 2: Backend Setup (Future)
1. Initialize NestJS project
2. Configure ESLint and Prettier
3. Set up Jest for testing
4. Create GitHub Actions workflow for backend CI
5. Add socket.io testing setup

### Phase 3: Shared Types
1. Create shared package for TypeScript types
2. Configure build process for shared package
3. Set up imports in frontend and backend

## Success Criteria

- All linters pass with zero warnings on clean code
- Code formatter runs automatically
- Test suite runs successfully with >70% coverage
- CI pipeline runs on every PR and blocks merge on failure
- Type safety enforced across frontend and backend
- Developer experience is smooth with fast feedback loops

## Notes

- Start with frontend as specified
- Keep configuration minimal but effective
- Focus on developer productivity
- Ensure fast CI pipeline execution (<5 minutes for frontend)
