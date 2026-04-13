# hadolint ignore=DL3006
FROM node:22-alpine AS base
WORKDIR /app

# 의존성 설치
FROM base AS deps
# hadolint ignore=DL3018
RUN apk add --no-cache libc6-compat
COPY apps/web/package.json apps/web/
WORKDIR /app/apps/web
RUN npm install

# 빌드
FROM base AS builder
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY apps/web apps/web/
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app/apps/web
RUN npx next build

# 런타임
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/web/server.js"]
