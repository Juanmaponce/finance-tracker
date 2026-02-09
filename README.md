# Finance Tracker

Personal finance application for expense tracking and savings management. Mobile-first PWA built with React + TypeScript (frontend) and Node.js + Express + TypeScript (backend).

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Zustand, TanStack Query, Recharts, Tailwind CSS, shadcn/ui
- **Backend:** Node.js, Express, TypeScript, Prisma, Zod, JWT
- **Database:** PostgreSQL 16
- **Cache:** Redis 7
- **Infrastructure:** Docker Compose, Vercel (FE), Railway (BE)

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm 10+

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url>
cd finance-tracker

# Install all dependencies
npm install
cd frontend && npm install
cd ../backend && npm install
```

### 2. Environment setup

```bash
cp .env.example .env
cp .env.example backend/.env
```

### 3. Start infrastructure

```bash
docker compose up -d
```

### 4. Initialize database

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Run development servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api/v1
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## Project Structure

```
finance-tracker/
├── frontend/                 # React + Vite PWA
│   └── src/
│       ├── components/
│       │   ├── atoms/        # Buttons, inputs, icons
│       │   ├── molecules/    # Form fields, cards
│       │   ├── organisms/    # Forms, charts, navigation
│       │   ├── templates/    # Page layouts
│       │   ├── pages/        # Full pages
│       │   └── ui/           # shadcn/ui components
│       ├── hooks/            # Custom React hooks
│       ├── stores/           # Zustand stores
│       ├── services/         # API client functions
│       ├── utils/            # Helper functions
│       ├── types/            # TypeScript types
│       └── lib/              # Utility configs (cn, etc.)
├── backend/                  # Node.js + Express API
│   ├── prisma/               # Schema & migrations
│   └── src/
│       ├── modules/          # Feature modules
│       │   ├── auth/
│       │   ├── transactions/
│       │   ├── categories/
│       │   ├── savings/
│       │   ├── recurring/
│       │   ├── reports/
│       │   └── users/
│       ├── middleware/       # Auth, rate limit, error handler
│       ├── lib/              # Prisma client, Redis, errors
│       ├── config/           # App configuration
│       ├── cron/             # Scheduled jobs
│       └── types/            # Shared types
├── docker-compose.yml        # PostgreSQL + Redis
├── .env.example              # Environment template
└── skills/                   # Claude Code skills
```

## Scripts

### Root

- `npm run test` - Run all backend + frontend tests
- `npm run test:backend` - Run backend tests only
- `npm run test:frontend` - Run frontend tests only
- `npm run e2e` - Run Playwright E2E tests
- `npm run lint` - Lint all code
- `npm run format:check` - Check formatting

### Frontend

- `npm run dev` - Start dev server
- `npm run build` - Production build
- `npm run preview` - Preview production build
- `npm test` - Run Vitest unit tests
- `npm run test:watch` - Run tests in watch mode

### Backend

- `npm run dev` - Start dev server with hot reload
- `npm run build` - Compile TypeScript
- `npm run start` - Start production server
- `npm test` - Run Jest unit tests
- `npm run test:ci` - Run tests with coverage (CI)
- `npm run migrate:deploy` - Run Prisma migrations (production)
- `npx prisma studio` - Database GUI

## Testing

### Backend Unit Tests (Jest)

```bash
cd backend && npm test
```

Tests cover: currency conversion, auto-categorization, report calculations, auth service.

### Backend Integration Tests

```bash
# Requires running PostgreSQL + Redis (docker compose up -d)
cd backend && RUN_INTEGRATION_TESTS=true npm test
```

Tests cover: auth endpoints, transaction CRUD, report endpoints.

### Frontend Unit Tests (Vitest)

```bash
cd frontend && npm test
```

Tests cover: currency formatting, date formatting, input sanitization.

### E2E Tests (Playwright)

```bash
# Requires both frontend and backend running
npx playwright test
```

## CI/CD

- **CI** (`.github/workflows/ci.yml`): Runs on push/PR to `main`/`develop`. Lints, runs unit + integration tests, builds both frontend and backend.
- **Deploy** (`.github/workflows/deploy.yml`): Runs on push to `main`. Deploys frontend to Vercel, backend to Railway with Prisma migrations.

### Required GitHub Secrets

| Secret              | Description              |
| ------------------- | ------------------------ |
| `VERCEL_TOKEN`      | Vercel deployment token  |
| `VERCEL_ORG_ID`     | Vercel organization ID   |
| `VERCEL_PROJECT_ID` | Vercel project ID        |
| `RAILWAY_TOKEN`     | Railway deployment token |

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable                | Description                      | Default                                           |
| ----------------------- | -------------------------------- | ------------------------------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string     | `postgresql://...@localhost:5432/finance_tracker` |
| `REDIS_URL`             | Redis connection string          | `redis://localhost:6379`                          |
| `JWT_SECRET`            | Access token signing secret      | -                                                 |
| `JWT_REFRESH_SECRET`    | Refresh token signing secret     | -                                                 |
| `CORS_ORIGIN`           | Allowed frontend origin          | `http://localhost:5173`                           |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name (receipts) | -                                                 |

## License

Private - All rights reserved.
