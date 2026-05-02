# ft_transcendence - CI/CD, Test, Lint Setup Tasks

## Phase 1: Frontend Setup (Priority)

### Task 1: Initialize Frontend Project Structure
- [ ] Create `frontend/` directory
- [ ] Initialize Vite project with React + TypeScript template
- [ ] Verify project runs with `npm run dev`
- [ ] Install React Three Fiber dependencies
- [ ] Create basic project structure (src/components, src/pages, etc.)

### Task 2: ESLint Configuration
- [ ] Install ESLint dependencies
  - `eslint`
  - `@typescript-eslint/parser`
  - `@typescript-eslint/eslint-plugin`
  - `eslint-plugin-react`
  - `eslint-plugin-react-hooks`
  - `eslint-plugin-import`
- [ ] Create `.eslintrc.json` configuration file
- [ ] Add ESLint scripts to `package.json`
- [ ] Test ESLint on sample files
- [ ] Fix any initial linting errors

### Task 3: Prettier Configuration
- [ ] Install Prettier dependencies
  - `prettier`
  - `eslint-config-prettier`
  - `eslint-plugin-prettier`
- [ ] Create `.prettierrc.json` configuration file
- [ ] Add Prettier scripts to `package.json`
- [ ] Integrate Prettier with ESLint
- [ ] Format all existing files

### Task 4: Vitest and Testing Library Setup
- [ ] Install Vitest dependencies
  - `vitest`
  - `@vitest/ui`
  - `jsdom`
- [ ] Install Testing Library dependencies
  - `@testing-library/react`
  - `@testing-library/jest-dom`
  - `@testing-library/user-event`
- [ ] Create `vitest.config.ts` configuration file
- [ ] Set up test environment with jsdom
- [ ] Add test scripts to `package.json`
- [ ] Create sample component test to verify setup
- [ ] Configure coverage reporting

### Task 5: GitHub Actions - Frontend CI Workflow
- [ ] Create `.github/workflows/frontend-ci.yml`
- [ ] Configure workflow triggers (push, PR)
- [ ] Add Node.js setup step
- [ ] Add dependency caching
- [ ] Create lint job
- [ ] Create type check job
- [ ] Create test job with coverage
- [ ] Create build job
- [ ] Test workflow by pushing to branch
- [ ] Verify all jobs pass

### Task 6: Pre-commit Hooks (Optional)
- [ ] Install Husky
- [ ] Install lint-staged
- [ ] Configure pre-commit hook for linting
- [ ] Configure pre-commit hook for formatting
- [ ] Configure pre-commit hook for type checking
- [ ] Test hooks with sample commit

### Task 7: Documentation and Sample Code
- [ ] Update README.md with setup instructions
- [ ] Add development workflow documentation
- [ ] Create sample React component with tests
- [ ] Create sample R3F component (basic 3D scene)
- [ ] Document CI/CD pipeline

## Phase 2: Backend Setup (Future)

### Task 8: Initialize NestJS Project
- [ ] Create `backend/` directory
- [ ] Initialize NestJS project
- [ ] Verify project runs with `npm run start:dev`
- [ ] Create basic project structure

### Task 9: Backend Linting and Formatting
- [ ] Configure ESLint for NestJS
- [ ] Configure Prettier
- [ ] Add linting scripts

### Task 10: Backend Testing Setup
- [ ] Configure Jest
- [ ] Set up Supertest for E2E tests
- [ ] Create sample service test
- [ ] Create sample controller test
- [ ] Configure coverage reporting

### Task 11: GitHub Actions - Backend CI Workflow
- [ ] Create `.github/workflows/backend-ci.yml`
- [ ] Configure workflow triggers
- [ ] Add lint, test, and build jobs
- [ ] Test workflow

## Phase 3: Shared Types (Future)

### Task 12: Shared Package Setup
- [ ] Create `shared/` directory
- [ ] Initialize TypeScript package
- [ ] Configure build process
- [ ] Create sample shared types
- [ ] Set up imports in frontend and backend

## Progress Tracking

- **Current Phase**: Phase 1
- **Current Task**: Not started
- **Blockers**: None
- **Notes**: Starting with frontend setup as requested
