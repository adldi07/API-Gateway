# 🌐 Distributed API Gateway

A production-grade API Gateway built to meticulously handle reverse proxying, per-API-key rate limiting, asynchronous traffic analytics, and live monitoring via Server-Sent Events. 

---

## 🌍 Live Environment

- 🚀 **Admin Dashboard:** [https://api-gateway-adesh.vercel.app](https://api-gateway-adesh.vercel.app)
- 🔌 **Gateway API:** [https://13-127-252-167.sslip.io](https://13-127-252-167.sslip.io)
- 💖 **Health Status:** [https://13-127-252-167.sslip.io/health](https://13-127-252-167.sslip.io/health)

---

## 🏗 Technical Architecture

### System Design Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                       VERCEL EDGE CLOUD                     │
│                                                             │
│  ┌─────────────────┐ ┌────────────────┐ ┌────────────────┐  │
│  │  Admin UI       │ │  Serverless    │ │  Live Charts   │  │
│  │  (Next.js)      │ │  API Routes    │ │  (Recharts)    │  │
│  └─────────────────┘ └────────────────┘ └────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │ HTTPS / Live SSE Stream
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                        AWS EC2 INSTANCE                     │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                 CADDY REVERSE PROXY                   │  │
│  │  - SSL/TLS Termination (Let's Encrypt / sslip.io)     │  │
│  │  - Read Timeout: 300s (Preserves SSE connections)     │  │
│  └─────────────────────────┬─────────────────────────────┘  │
│                            │ HTTP: 3001 (Internal)          │
│                            ▼                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  NODE.JS API GATEWAY                  │  │
│  │                                                       │  │
│  │  ┌──────────────┐   ┌──────────────┐   ┌───────────┐  │  │
│  │  │ Rate Limiter │   │ Route Proxy  │   │ Analytics │  │  │
│  │  │ (Lua Config) │   │ (Express)    │   │ Batch API │  │  │
│  │  └──────┬───────┘   └──────┬───────┘   └─────┬─────┘  │  │
│  └─────────┼──────────────────┼─────────────────┼────────┘  │
│            │                  │                 │           │
│  ┌─────────▼───────┐ ┌────────▼───────┐ ┌───────▼────────┐  │
│  │ REDIS DATATIER  │ │ UPSTREAM APIs  │ │ POSTGRES DB    │  │
│  │ - Cache         │ │ - Microservices│ │ - Auth Keys    │  │
│  │ - Atomic Limits │ │                │ │ - Traffic Logs │  │
│  └─────────────────┘ └────────────────┘ └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Architectural Flow & Decisions

1. **Decoupled Architecture (Vercel + AWS)**  
   The system is split to play to the strengths of both platforms. Vercel hosts the stateless React frontend globally on its Edge CDN. AWS EC2 handles the stateful, high-throughput, long-living Server-Sent Event (SSE) connections that serverless functions would otherwise prematurely terminate.

2. **Zero-Config SSL via sslip.io**  
   Managing HTTPS manually in Node.js is cumbersome. By routing traffic through Caddy using an `sslip.io` IP-based domain, the system automatically provisions and renews production-grade Let's Encrypt certificates with zero manual DNS mapping.

3. **High-Velocity Rate Limiting**  
   The Gateway enforces strict API Quotas using **Redis array-based Lua scripts**. This pushes the rate-limit calculation directly into the Redis memory cache, ensuring atomic evaluations and preventing race conditions under high concurrency.

4. **Analytics Batch Processing**  
   To prevent intense load from choking the PostgreSQL database during traffic spikes, the Gateway logs every request immediately into an in-memory queue. A highly optimized `Batch Writer` flushes this memory buffer to PostgreSQL asynchronously every 5 seconds.

---

## 💻 Tech Stack

- **Dashboard:** Next.js 15, React, TailwindCSS v4, Recharts
- **Gateway Core:** Node.js, Express, `http-proxy-middleware`, TypeScript
- **State & Data:** PostgreSQL (`node-postgres`), Redis (`ioredis`)
- **DevOps:** Docker, GitHub Actions, Caddy

---

## 🛠 Local Setup

Clone the repository and bootstrap the workspaces:
```bash
npm install
```

Boot the persistence databases locally via Docker:
```bash
docker compose up -d postgres redis
```

Run schema migrations and initialize both frontend & backend simultaneously:
```bash
# Terminal 1: Backend
npm run migrate:gateway
npm run dev:gateway

# Terminal 2: Frontend
npm run dev:dashboard
```

---

## 🚢 Production CI/CD Pipeline

The project implements an **automated zero-downtime deployment pipeline** via GitHub Actions.

1. Any push to `main` triggers a GitHub Action runner.
2. The pipeline surgically builds a strictly minimized Node.js container for the Gateway, dynamically stripping all heavy Dashboard dependencies from the Docker build context to create a lightning-fast image.
3. The image is published to GHCR.
4. The runner connects via SSH into the AWS EC2 Host, pulls the latest images, safely runs PostgreSQL migrations via a temporary container, and gracefully spins up the PostgreSQL, Redis, Gateway, and Caddy instances without dropping existing traffic.
