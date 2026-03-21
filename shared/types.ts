// ─── Database Row Types ──────────────────────────────────────────────

export interface ApiKey {
  id: string;
  key_value: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RateLimitConfig {
  id: string;
  api_key_id: string;
  algorithm: 'token_bucket' | 'sliding_window';
  bucket_capacity: number;
  refill_rate: number;
  refill_interval_ms: number;
  window_size_ms: number;
  max_requests: number;
  created_at: string;
  updated_at: string;
}

export interface UpstreamRoute {
  id: string;
  path_prefix: string;
  target_url: string;
  strip_prefix: boolean;
  is_active: boolean;
  created_at: string;
}

export interface RequestLog {
  id: number;
  api_key_id: string | null;
  method: string;
  path: string;
  status_code: number;
  latency_ms: number;
  ip_address: string | null;
  user_agent: string | null;
  rate_limited: boolean;
  created_at: string;
}

// ─── Rate Limiting ───────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number; // seconds
}

// ─── SSE Events ──────────────────────────────────────────────────────

export interface RequestEvent {
  method: string;
  path: string;
  statusCode: number;
  latencyMs: number;
  apiKeyId: string | null;
  ip: string | null;
  rateLimited: boolean;
  timestamp: string;
}

// ─── Analytics ───────────────────────────────────────────────────────

export interface AnalyticsSummary {
  totalRequests: number;
  avgLatency: number;
  errorRate: number;
  topPaths: { path: string; count: number }[];
}
