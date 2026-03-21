export const API_KEY_HEADER = 'x-api-key';
export const GATEWAY_REQUEST_ID_HEADER = 'x-gateway-request-id';

export const RATE_LIMIT_HEADERS = {
  LIMIT: 'X-RateLimit-Limit',
  REMAINING: 'X-RateLimit-Remaining',
  RESET: 'X-RateLimit-Reset',
} as const;

export const DEFAULT_RATE_LIMIT = {
  algorithm: 'token_bucket' as const,
  bucket_capacity: 100,
  refill_rate: 10,
  refill_interval_ms: 1000,
  window_size_ms: 60_000,
  max_requests: 100,
};

export const BATCH_DEFAULTS = {
  FLUSH_INTERVAL_MS: 5000,
  MAX_SIZE: 100,
  MAX_BUFFER: 10_000,
};
