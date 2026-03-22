/// <reference path="./types/express.d.ts" />
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { env } from './config/env';
import { pgHealthCheck } from './db/pool';
import { redisHealthCheck } from './redis/client';
import { requestIdMiddleware } from './middleware/requestId';
import { requestLogger } from './middleware/requestLogger';
import { authenticate } from './middleware/authenticate';
import { rateLimitMiddleware } from './middleware/rateLimitMiddleware';
import { proxyHandler } from './proxy/proxyHandler';
import adminRouter from './admin/adminRouter';
import { startBatchWriter } from './analytics/batchWriter';

const app = express();

startBatchWriter();

// ─── Global middleware ───────────────────────────────────────────────
app.use(cors());
app.use(helmet());
app.use(
  compression({
    filter: (req, res) => {
      if (req.path === '/admin/events') {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);
app.use(requestIdMiddleware);

// ─── Health check (no auth) ─────────────────────────────────────────
app.get('/health', async (_req, res) => {
  const [pg, redis] = await Promise.all([pgHealthCheck(), redisHealthCheck()]);
  const healthy = pg && redis;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    services: { postgres: pg ? 'up' : 'down', redis: redis ? 'up' : 'down' },
    timestamp: new Date().toISOString(),
  });
});

// ─── Admin API (JSON body parsing, admin auth inside router) ────────
app.use('/admin', express.json(), adminRouter);

// ─── Gateway proxy pipeline ─────────────────────────────────────────
// 1. Log the request
// 2. Authenticate via x-api-key
// 3. Rate limit check
// 4. Proxy to upstream
app.use(
  requestLogger,
  authenticate,
  rateLimitMiddleware,
  proxyHandler
);

// ─── Start server ────────────────────────────────────────────────────
app.listen(env.PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   🚀  API Gateway running on port ${env.PORT}      ║
  ║   🌍  Environment: ${env.NODE_ENV.padEnd(23)}║
  ╚══════════════════════════════════════════════╝
  `);
});

export default app;
