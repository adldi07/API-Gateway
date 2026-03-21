import { randomUUID } from 'node:crypto';
import { redis } from '../redis/client';
import { RateLimitConfig, RateLimitResult } from '../../../shared/types';

export async function checkSlidingWindow(
  apiKeyId: string,
  config: Pick<RateLimitConfig, 'window_size_ms' | 'max_requests'>
): Promise<RateLimitResult> {
  const key = `rl:sw:${apiKeyId}`;
  const now = Date.now();
  const windowSizeMs = Math.max(1, config.window_size_ms);
  const maxRequests = Math.max(1, config.max_requests);
  const windowStart = now - windowSizeMs;
  const requestId = `${now}:${randomUUID()}`;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);
  pipeline.zadd(key, now, requestId);
  pipeline.zcard(key);
  pipeline.pexpire(key, windowSizeMs * 2);

  const results = await pipeline.exec();
  const countRaw = results?.[2]?.[1];
  const count = Number(countRaw ?? 0);

  if (count > maxRequests) {
    await redis.zrem(key, requestId);

    const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
    const retryAfterMs = oldest.length >= 2
      ? Math.max(0, Number(oldest[1]) + windowSizeMs - now)
      : windowSizeMs;

    return {
      allowed: false,
      remaining: 0,
      retryAfter: retryAfterMs / 1000,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - count),
    retryAfter: 0,
  };
}