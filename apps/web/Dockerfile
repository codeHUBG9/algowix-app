# 21-Deployment.md §2 — adapted for this repo's Turborepo layout. Optional:
# see apps/server/Dockerfile's header comment — the documented local dev path
# is native, not containerized.
FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@9.15.0

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY packages/config/package.json ./packages/config/package.json
RUN pnpm install --frozen-lockfile --filter @algowix/web... --filter @algowix/shared-types

FROM deps AS builder
COPY . .
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm --filter @algowix/web build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
