FROM node:20-slim AS builder
WORKDIR /app
# Load all workspaces
COPY package.json package-lock.json* ./
COPY gateway/package.json ./gateway/
COPY shared/package.json ./shared/
COPY dashboard/package.json ./dashboard/
RUN rm -f package-lock.json && npm i --include=optional --no-fund --no-audit

# Source and build
COPY gateway/ ./gateway/
COPY shared/ ./shared/
RUN npm run build:gateway

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY package.json package-lock.json* ./
COPY gateway/package.json ./gateway/
COPY shared/package.json ./shared/
COPY dashboard/package.json ./dashboard/
RUN rm -f package-lock.json && npm i --omit=dev --include=optional --no-fund --no-audit

# Output files
COPY --from=builder /app/gateway/dist ./gateway/dist
COPY --from=builder /app/gateway/src/rateLimit/lua ./gateway/src/rateLimit/lua
COPY --from=builder /app/gateway/src/db/migrations ./gateway/dist/gateway/src/db/migrations

WORKDIR /app/gateway
EXPOSE 3001
CMD ["npm", "run", "start"]