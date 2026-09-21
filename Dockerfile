# ── 构建阶段 ──
FROM node:24-alpine AS builder
WORKDIR /app

# 先装依赖（利用 Docker 层缓存）
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# 构建时需要的非敏感环境变量（真正的密钥运行时注入）
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
ENV NEXT_TELEMETRY_DISABLED=1

COPY . .
RUN npx prisma generate && npm run build

# ── 运行阶段 ──
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# standalone 运行时（含 node_modules 精简副本）
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma engine 与 schema（容器内首次启动执行 db push 可选）
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["node", "server.js"]
