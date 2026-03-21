CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── API Keys (multi-tenancy) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_value   VARCHAR(64) UNIQUE NOT NULL,
    name        VARCHAR(128) NOT NULL,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Per-key rate limit configuration ────────────────────────────────
CREATE TABLE IF NOT EXISTS rate_limit_configs (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key_id          UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    algorithm           VARCHAR(20) NOT NULL DEFAULT 'token_bucket',
    -- Token Bucket params
    bucket_capacity     INT DEFAULT 100,
    refill_rate         INT DEFAULT 10,
    refill_interval_ms  INT DEFAULT 1000,
    -- Sliding Window params
    window_size_ms      BIGINT DEFAULT 60000,
    max_requests        INT DEFAULT 100,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(api_key_id)
);

-- ─── Upstream route mappings ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS upstream_routes (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    path_prefix    VARCHAR(128) UNIQUE NOT NULL,
    target_url     VARCHAR(512) NOT NULL,
    strip_prefix   BOOLEAN DEFAULT true,
    is_active      BOOLEAN DEFAULT true,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Request analytics log ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS request_logs (
    id           BIGSERIAL PRIMARY KEY,
    api_key_id   UUID REFERENCES api_keys(id),
    method       VARCHAR(10) NOT NULL,
    path         VARCHAR(512) NOT NULL,
    status_code  SMALLINT NOT NULL,
    latency_ms   INT NOT NULL,
    ip_address   INET,
    user_agent   VARCHAR(512),
    rate_limited BOOLEAN DEFAULT false,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_logs_api_key    ON request_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_status     ON request_logs(status_code);

-- ─── Seed: test API key ─────────────────────────────────────────────
INSERT INTO api_keys (key_value, name)
VALUES ('test-key-001', 'Test Key')
ON CONFLICT (key_value) DO NOTHING;

-- Seed: default rate limit config for the test key
INSERT INTO rate_limit_configs (api_key_id, algorithm)
SELECT id, 'token_bucket' FROM api_keys WHERE key_value = 'test-key-001'
ON CONFLICT (api_key_id) DO NOTHING;
