#!/usr/bin/env bash
set -e

echo "🚀 Starting KairoPro Local Development Environment..."

# 1. Start infrastructure services (Postgres, Redis, MinIO, MailHog, Jaeger)
echo "📦 Starting Docker infrastructure containers..."
docker compose up -d

# 2. Wait for Postgres to be healthy
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker exec kairopro-postgres pg_isready -U kairopro -d kairopro > /dev/null 2>&1; do
  sleep 1
done
echo "✅ PostgreSQL is ready!"

# 3. Generate Prisma client & sync schema
echo "🔄 Generating Prisma Client..."
pnpm --filter @kairopro/web db:generate

# 4. Start monorepo dev servers (Next.js + FastAPI)
echo "⚡ Starting Next.js and FastAPI..."
pnpm dev
