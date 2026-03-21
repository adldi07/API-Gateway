-- KEYS[1] = rl:tb:{apiKeyId}
-- ARGV[1] = bucket_capacity
-- ARGV[2] = refill_rate
-- ARGV[3] = refill_interval_ms
-- ARGV[4] = now (epoch ms)
-- ARGV[5] = tokens_to_consume

local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local refill_interval = tonumber(ARGV[3])
local now = tonumber(ARGV[4])
local consume = tonumber(ARGV[5])

local data = redis.call('HMGET', key, 'tokens', 'last_ts')
local tokens = tonumber(data[1])
local last_ts = tonumber(data[2])

if tokens == nil then
    tokens = capacity
    last_ts = now
end

local elapsed = now - last_ts
local intervals = math.floor(elapsed / refill_interval)
if intervals > 0 then
    local refill = intervals * refill_rate
    tokens = math.min(capacity, tokens + refill)
    last_ts = last_ts + intervals * refill_interval
end

if tokens >= consume then
    tokens = tokens - consume
    redis.call('HMSET', key, 'tokens', tokens, 'last_ts', last_ts)
    redis.call('PEXPIRE', key, refill_interval * 2)
    return {1, tokens, 0}
else
    redis.call('HMSET', key, 'tokens', tokens, 'last_ts', last_ts)
    redis.call('PEXPIRE', key, refill_interval * 2)
    local retry = ((consume - tokens) / refill_rate) * refill_interval
    return {0, tokens, retry}
end