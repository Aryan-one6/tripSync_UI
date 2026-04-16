# TravellersIn

TravellersIn is a Turborepo with:

- `apps/web`: Next.js 16 frontend
- `apps/api`: Express + Prisma backend
- `packages/shared`: shared Zod schemas and types

This repo already uses PostgreSQL through Prisma. The simplest Supabase setup is to use Supabase free tier as the hosted Postgres database and keep the existing auth and API code unchanged.

## Supabase Free Tier Setup

### 1. Create a Supabase project

Create a new project in the Supabase dashboard on the free tier and save the database password you choose.

This repo is currently set up to use Supabase Postgres, not Supabase Auth. User authentication still runs through the custom JWT flows in `apps/api`.

### 2. Copy the env files

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

### 3. Fill in `apps/api/.env`

Use the connection strings from Supabase Dashboard -> `Connect`.

Required values:

- `DATABASE_URL`
  Use the Supavisor transaction pooler string on port `6543`, with `?pgbouncer=true&connection_limit=1`
- `DIRECT_URL`
  Use the direct database string on port `5432`
- `JWT_ACCESS_SECRET`
  Any random secret with at least 32 characters
- `JWT_REFRESH_SECRET`
  Any random secret with at least 32 characters

Example:

```env
DATABASE_URL="postgresql://postgres.[project-ref]:password@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:password@db.[project-ref].supabase.co:5432/postgres"
JWT_ACCESS_SECRET="replace-with-a-long-random-secret"
JWT_REFRESH_SECRET="replace-with-a-long-random-secret"
FRONTEND_URL="http://localhost:3000"
PORT=4010
NODE_ENV="development"
```

Optional integrations such as Redis, MSG91, DigiLocker, Razorpay, WhatsApp, and S3/R2 can stay empty while you bootstrap the project.

### 4. Fill in `apps/web/.env.local`

For local development:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4010/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:4010
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_RAZORPAY_KEY_ID=
```

### 5. Install dependencies and apply migrations

```bash
npm install
npm run db:generate
npm run db:deploy
```

If you want seed data:

```bash
npm run db:seed
```

### 6. Start local development

```bash
npm run dev
```

The web app runs at `http://localhost:3000` and the API runs at `http://localhost:4010`.

## Redis

Supabase replaces the Postgres container, not Redis.

If you want local Redis for queues, OTP durability, or the Socket.IO Redis adapter, start only Redis from Docker Compose:

```bash
docker compose up -d redis
```

If `REDIS_URL` is left empty, the API falls back to in-memory behavior for the parts of the app that support it.

For live/production deployments, use a managed Redis URL with TLS:

```env
REDIS_URL="rediss://default:<password>@<host>:6379"
```

If you set `NODE_ENV=production` with a `redis://` URL, the API now intentionally disables Redis and falls back to in-memory semantics to avoid non-TLS production traffic.

Quick production validation:

```bash
cd apps/api
npm run redis:check
```

The `/health` endpoint now includes Redis runtime status under `redis`.

Important runtime note:
When `VERCEL` is set, this codebase intentionally disables Socket.IO server runtime and BullMQ queues. If you need always-on realtime sockets or background workers, deploy `apps/api` on a long-running Node host (for example Render, Railway, Fly.io, or a VM/container) and keep Redis enabled there.

## Prisma Workflow

Use these commands from the repo root:

```bash
npm run db:generate
npm run db:deploy
npm run db:seed
```

Notes:

- `db:deploy` is the safe command for applying existing Prisma migrations to a hosted Supabase database.
- `db:migrate` still runs `prisma migrate dev`, which is best kept for local schema iteration rather than pointing at a shared hosted database.

## Deployment Notes

`apps/api` already runs `prisma migrate deploy` during `vercel-build`, so once the same env vars are configured in Vercel, the API can boot against the Supabase database without additional code changes.

If deploying with Vercel CLI, set Redis for all environments:

```bash
cd apps/api
vercel env add REDIS_URL production
vercel env add REDIS_URL preview
vercel env add REDIS_URL development
```

## References

- Supabase Prisma guide: https://supabase.com/docs/guides/database/prisma
- Supabase Prisma troubleshooting: https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting
