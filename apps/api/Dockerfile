FROM oven/bun:1.2-alpine AS base
WORKDIR /app

# 의존성 설치
FROM base AS deps
WORKDIR /app/apps/api
COPY apps/api/package.json .
COPY apps/api/prisma prisma/
RUN bun install && bunx prisma generate

# 빌드
FROM base AS builder
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY apps/api apps/api/
WORKDIR /app/apps/api
RUN bun run build

# 런타임
FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=deps /app/apps/api/prisma ./apps/api/prisma
COPY --from=deps /app/apps/api/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps /app/apps/api/node_modules/@prisma ./node_modules/@prisma

EXPOSE 4000
CMD ["bun", "run", "dist/index.js"]
