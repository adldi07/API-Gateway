import { DEFAULT_RATE_LIMIT } from '../../../shared/constants';
import { RateLimitConfig, RateLimitResult } from '../../../shared/types';
import { checkTokenBucket } from './tokenBucket';
import { checkSlidingWindow } from './slidingWindow';

function withDefaults(config?: RateLimitConfig): RateLimitConfig {
  return {
    id: config?.id ?? '',
    api_key_id: config?.api_key_id ?? '',
    algorithm: config?.algorithm ?? DEFAULT_RATE_LIMIT.algorithm,
    bucket_capacity: config?.bucket_capacity ?? DEFAULT_RATE_LIMIT.bucket_capacity,
    refill_rate: config?.refill_rate ?? DEFAULT_RATE_LIMIT.refill_rate,
    refill_interval_ms: config?.refill_interval_ms ?? DEFAULT_RATE_LIMIT.refill_interval_ms,
    window_size_ms: config?.window_size_ms ?? DEFAULT_RATE_LIMIT.window_size_ms,
    max_requests: config?.max_requests ?? DEFAULT_RATE_LIMIT.max_requests,
    created_at: config?.created_at ?? '',
    updated_at: config?.updated_at ?? '',
  };
}

export async function checkRateLimit(
  apiKeyId: string,
  config?: RateLimitConfig
): Promise<RateLimitResult> {
  const effectiveConfig = withDefaults(config);

  if (effectiveConfig.algorithm === 'sliding_window') {
    return checkSlidingWindow(apiKeyId, effectiveConfig);
  }

  return checkTokenBucket(apiKeyId, effectiveConfig);
}