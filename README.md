# Distributed API Gateway

A production-grade, distributed API Gateway that reverse-proxies upstream services, strictly enforces per-API-key rate limiting strategies, asynchronously logs request analytics, and powers a real-time monitoring dashboard.

Built using **Node.js, Express, Next.js, Redis, and PostgreSQL**, and rigorously tested for deployment via Docker to AWS EC2.

---

## 🚀 Key Features

- **Dynamic Reverse Proxying**: Instantly routes matching path-prefixes to distinct upstream services while preserving query parameters.
- **Advanced Rate Limiting**: Per-API-key algorithm selection. Supports highly precise **Token Bucket** utilizing atomic Redis Lua scripts and **Sliding Window Log** algorithms via Redis ZSETs.
- **Asynchronous Analytics Batching**: Logs thousands of request metadata payloads into memory buffers and flushes them to PostgreSQL via bulk-insertion chunks. Gracefully falls back to local JSON logs if the database experiences prolonged outages.
- **Live SSE Streaming**: Broadcasts live server traffic metrics directly to the Admin Dashboard via an optimal Server-Sent Events (SSE) stream.
- **Admin Dashboard**: A seamless UI built with Next.js & TailwindCSS designed to visualize aggregate request latencies and live traffic bursts.
- **Dockerized CI/CD**: Optimized, multi-stage, pruned container configurations coupled with an automated GitHub Actions deployment pipeline for frictionless zero-downtime EC2 rollouts.

---

## 🛠 Tech Stack

| Component | Technologies Used | Use Case |
|-----------|-------------------|----------|
| **API Gateway** | Node.js, Express, `http-proxy-middleware`, TypeScript | High-throughput reverse proxy, API key validation, rate strategy dispatcher. |
| **Data Layer** | PostgreSQL (`node-postgres`), Redis (`ioredis`) | PG for permanent configurations / analytics. Redis for blazing-fast atomic rate-limit tracking. |
| **Admin Dashboard**| Next.js (App Router), React, Recharts, TailwindCSS | Real-time monitoring UI querying the Gateway's secure Admin API routes. |
| **Infrastructure** | Docker, Docker Compose, GitHub Actions, bash | Containerization and remote execution over SSH directly into an AWS EC2 host. |

---

## 📂 Monorepo Structure

This project embraces an NPM Workspaces monorepo architecture:

```
.
├── dashboard/               # Next.js frontend (Admin UI)
│   ├── src/                 # Recharts and Server-Sent Event clients
│   └── Dockerfile           # Optimized Next.js standalone container build
├── gateway/                 # Express backend core
│   ├── src/                 # Middlewares, Routers, Lua Scripts, DB Migrations
│   └── Dockerfile           # Minified typescript-compiled Node pipeline
├── shared/                  # Agnostic utilities workspace
│   └── types.ts             # Shared typescript definitions (RequestLog, ApiKey)
├── .github/workflows/       # Automated EC2 CI/CD configuration
└── docker-compose.yml       # Primary container orchestrator (PG + Redis + Gateway + UI)
```

---

## 💻 Getting Started (Local Development)

### 1. Prerequisites
Ensure you have installed:
- [Node.js](https://nodejs.org/) (v20+)
- [Docker & Docker Compose](https://docs.docker.com/engine/install/)

### 2. Install Dependencies
Run from the root directory to bootstrap the NPM workspaces:
```bash
npm install
```

### 3. Setup the Databases
Start up the persistence layers (PostgreSQL and Redis) locally using Docker:
```bash
docker compose up -d postgres redis
```

### 4. Run Migrations & Boot Services
You must configure the SQL schema prior to launching the Gateway.
```bash
# Terminal 1: Migrate and boot the Gateway
npm run migrate --workspace @api-gateway/gateway
npm run dev --workspace @api-gateway/gateway

# Terminal 2: Boot the Dashboard
npm run dev --workspace @api-gateway/dashboard
```

Once running, the Dashboard is instantly accessible at **`http://localhost:3000`** and the Gateway reverse-proxy is listening on **`http://localhost:3001`**.

---

## 🔐 Environment Variables

You must supply distinct `.env` files for production depending on your environment. Key variables include:

**`gateway` Environment**
- `PORT`: Exposed port (e.g., `3001`)
- `ADMIN_SECRET`: Cryptographically secure random UI validation key.
- `PG_USER` / `PG_PASSWORD` / `PG_DATABASE`: PostgreSQL connection details.
- `REDIS_URL`: Connect string (e.g., `redis://localhost:6379`)
- `REDIS_FAIL_MODE`: Set to `open` (allow traffic if Redis drops) or `closed` (block traffic).

**`dashboard` Environment**
- `NEXT_PUBLIC_GATEWAY_URL`: Public facing gateway URL for the UI client.
- `GATEWAY_ADMIN_SECRET`: Must perfectly match the gateway's `ADMIN_SECRET`.

---

## 🚢 Production EC2 Deployment

Deployment to AWS occurs effortlessly via the packaged `.github/workflows/deploy-ec2.yml` GitHub Action.

**Requirements:**
1. Provision a bare-metal/EC2 Linux environment with **Docker** and **Docker Compose V2** active.
2. Ensure you have mapped GitHub Repository Secrets targeting your EC2 instance (`EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`).
3. Push ANY code change to the `main` branch. 

The GitHub Action behaves fully autonomously: Authenticating into GHCR, pulling ultra-minified standalone images, booting persistence clusters, safely verifying schemas via `--rm migrate:prod` and cleanly launching the active proxy tiers without port contention.
