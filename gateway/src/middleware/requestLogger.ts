import { Request, Response, NextFunction } from 'express';
import { pushRequestLog } from '../analytics/batchWriter';
import { broadcastRequestEvent } from '../analytics/realtimeBroadcast';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // Capture response finish to log the result
  res.on('finish', () => {
    const latency = Date.now() - start;
    const logEntry = {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      latencyMs: latency,
      apiKeyId: req.apiKey?.id || null,
      ip: req.ip || req.socket.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null,
      rateLimited: res.statusCode === 429,
      timestamp: new Date().toISOString(),
    };

    pushRequestLog({
      api_key_id: logEntry.apiKeyId,
      method: logEntry.method,
      path: logEntry.path,
      status_code: logEntry.statusCode,
      latency_ms: logEntry.latencyMs,
      ip_address: logEntry.ip,
      user_agent: Array.isArray(logEntry.userAgent) ? logEntry.userAgent[0] ?? null : logEntry.userAgent,
      rate_limited: logEntry.rateLimited,
      created_at: logEntry.timestamp,
    });

    broadcastRequestEvent(logEntry);

    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 ${logEntry.method} ${logEntry.path} → ${logEntry.statusCode} (${latency}ms)`);
    }
  });

  next();
}
