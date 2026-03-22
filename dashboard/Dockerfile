FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY gateway/package.json ./gateway/
COPY shared/package.json ./shared/
COPY dashboard/package.json ./dashboard/
RUN rm -f package-lock.json && npm i --include=optional --no-fund --no-audit

COPY dashboard/ ./dashboard/
COPY shared/ ./shared/
RUN mkdir -p /app/dashboard/public
RUN npm run build:dashboard

FROM node:20-slim AS runner
WORKDIR /app/dashboard
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Monorepo standalone output preserves the full directory tree:
#   .next/standalone/          → root node_modules + package.json
#   .next/standalone/app/dashboard/ → server.js + dashboard node_modules
COPY --from=builder /app/dashboard/.next/standalone/app/dashboard ./
COPY --from=builder /app/dashboard/.next/standalone/node_modules ./node_modules
COPY --from=builder /app/dashboard/.next/static ./.next/static
COPY --from=builder /app/dashboard/public ./public

EXPOSE 3000
CMD ["node", "server.js"]