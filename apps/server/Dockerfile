# 21-Deployment.md §2 — adapted for this repo's actual layout (Turborepo +
# pnpm workspaces, apps/server not apps/api, prisma schema instead of a
# generic build step). Optional: local dev normally runs directly on the
# host against native SQL Server Express (see the root README-equivalent
# session notes) — this Dockerfile is for anyone who wants a fully
# containerized stack via docker-compose.yml instead.
FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@9.15.0

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json ./apps/server/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY packages/platform-sdk/package.json ./packages/platform-sdk/package.json
COPY packages/config/package.json ./packages/config/package.json
RUN pnpm install --frozen-lockfile --filter @algowix/server... --filter @algowix/shared-types

FROM deps AS builder
COPY . .
RUN pnpm --filter @algowix/shared-types build
RUN pnpm --filter @algowix/server prisma:generate
RUN pnpm --filter @algowix/server build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/prisma ./apps/server/prisma
COPY --from=builder /app/apps/server/package.json ./apps/server/package.json
COPY --from=builder /app/packages/shared-types ./packages/shared-types

WORKDIR /app/apps/server
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "fetch('http://localhost:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
