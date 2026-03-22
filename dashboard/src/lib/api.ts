export type ApiKey = {
  id: string;
  key_value: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  algorithm?: "token_bucket" | "sliding_window";
  bucket_capacity?: number;
  refill_rate?: number;
  refill_interval_ms?: number;
  window_size_ms?: number;
  max_requests?: number;
};

export type RateLimitConfig = {
  id: string;
  api_key_id: string;
  algorithm: "token_bucket" | "sliding_window";
  bucket_capacity: number;
  refill_rate: number;
  refill_interval_ms: number;
  window_size_ms: number;
  max_requests: number;
  created_at: string;
  updated_at: string;
};

export type RequestLog = {
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
};

export type AnalyticsSummary = {
  totalRequests: number;
  avgLatency: number;
  errorRate: number;
  topPaths: Array<{ path: string; count: number }>;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed (${res.status}): ${text || res.statusText}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export async function fetchApiKeys(page = 1, limit = 20) {
  return request<{ data: ApiKey[]; total: number }>(`/api-keys?page=${page}&limit=${limit}`);
}

export async function createApiKey(name: string) {
  return request<{ data: ApiKey }>("/api-keys", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function updateApiKey(id: string, patch: Partial<Pick<ApiKey, "name" | "is_active">>) {
  return request<{ data: ApiKey }>(`/api-keys/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteApiKey(id: string) {
  return request<void>(`/api-keys/${id}`, { method: "DELETE" });
}

export async function fetchRateLimit(apiKeyId: string) {
  return request<{ data: RateLimitConfig }>(`/rate-limits/${apiKeyId}`);
}

export async function saveRateLimit(apiKeyId: string, payload: Partial<RateLimitConfig>) {
  return request<{ data: RateLimitConfig }>(`/rate-limits/${apiKeyId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function fetchLogs(params: {
  page?: number;
  limit?: number;
  status?: number;
  path?: string;
  apiKeyId?: string;
}) {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.status) sp.set("status", String(params.status));
  if (params.path) sp.set("path", params.path);
  if (params.apiKeyId) sp.set("apiKeyId", params.apiKeyId);

  return request<{ data: RequestLog[]; total: number }>(`/analytics/logs?${sp.toString()}`);
}

export async function fetchSummary() {
  return request<AnalyticsSummary>("/analytics/summary");
}
