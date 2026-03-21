import { Request, Response, NextFunction } from 'express';
import { RATE_LIMIT_HEADERS } from '../../../shared/constants';
import { env } from '../config/env';
import { checkRateLimit } from '../rateLimit/rateLimiter';
import { broadcastRateLimitEvent } from '../analytics/realtimeBroadcast';

/**
 * Enforces per-key rate limiting and sets standard rate-limit headers.
 */
export async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.apiKey) {
    return res.status(500).json({ error: 'internal', message: 'Missing authenticated API key context' });
  }

  const config = req.rateLimitConfig;
  const limit = config?.algorithm === 'sliding_window'
    ? config.max_requests
    : config?.bucket_capacity ?? 100;

  try {
    const result = await checkRateLimit(req.apiKey.id, config);
    const resetInSeconds = result.retryAfter > 0
      ? Math.ceil(result.retryAfter)
      : Math.ceil((config?.algorithm === 'sliding_window'
          ? (config?.window_size_ms ?? 60_000)
          : (config?.refill_interval_ms ?? 1_000)) / 1000);

    res.setHeader(RATE_LIMIT_HEADERS.LIMIT, String(limit));
    res.setHeader(RATE_LIMIT_HEADERS.REMAINING, String(Math.max(0, result.remaining)));
    res.setHeader(RATE_LIMIT_HEADERS.RESET, String(Math.floor(Date.now() / 1000) + resetInSeconds));

    if (!result.allowed) {
      broadcastRateLimitEvent({
        apiKeyId: req.apiKey.id,
        algorithm: config?.algorithm ?? 'token_bucket',
        remaining: Math.max(0, result.remaining),
        retryAfter: result.retryAfter,
      });

      res.setHeader('Retry-After', String(Math.max(1, Math.ceil(result.retryAfter))));
      return res.status(429).json({
        error: 'rate_limit_exceeded',
        message: 'Too many requests',
        retryAfter: result.retryAfter,
      });
    }

    return next();
  } catch (err) {
    if (env.REDIS_FAIL_MODE === 'closed') {
      return res.status(503).json({
        error: 'service_unavailable',
        message: 'Rate limit service unavailable',
      });
    }

    console.warn('Rate limiting unavailable, failing open:', err);
    res.setHeader(RATE_LIMIT_HEADERS.LIMIT, String(limit));
    res.setHeader(RATE_LIMIT_HEADERS.REMAINING, '-1');
    res.setHeader(RATE_LIMIT_HEADERS.RESET, String(Math.floor(Date.now() / 1000)));
    return next();
  }
}
