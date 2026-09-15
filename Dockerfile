FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl curl tini bash
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin ./node_modules/.bin
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder /app/node_modules/esbuild ./node_modules/esbuild
COPY --from=builder /app/node_modules/typescript ./node_modules/typescript
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/node_modules/@node-rs ./node_modules/@node-rs
COPY --from=builder /app/node_modules/otplib ./node_modules/otplib
COPY --from=builder /app/node_modules/hi-base32 ./node_modules/hi-base32
COPY --from=builder /app/node_modules/qrcode ./node_modules/qrcode
COPY --from=builder /app/node_modules/clsx ./node_modules/clsx
COPY --from=builder /app/node_modules/tailwind-merge ./node_modules/tailwind-merge
COPY --from=builder /app/node_modules/@types ./node_modules/@types
COPY --from=builder /app/lib ./lib

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

RUN mkdir -p /app/uploads /app/backups \
    && chown -R nextjs:nodejs /app/uploads /app/backups

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--", "/app/docker-entrypoint.sh"]
