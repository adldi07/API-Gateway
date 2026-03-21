import fs from 'node:fs';
import path from 'node:path';
import { redis } from '../redis/client';
import { RateLimitConfig, RateLimitResult } from '../../../shared/types';

type LuaResult = [number, number, number];

let scriptSha: string | null = null;
let scriptLoadPromise: Promise<string> | null = null;

function getLuaScriptPath(): string {
  return path.join(process.cwd(), 'src', 'rateLimit', 'lua', 'tokenBucket.lua');
}

async function loadScriptSha(): Promise<string> {
  if (scriptSha) return scriptSha;
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = (async () => {
    const script = fs.readFileSync(getLuaScriptPath(), 'utf8');
    const sha = (await redis.script('LOAD', script)) as string;
    scriptSha = sha;
    return sha;
  })();

  return scriptLoadPromise;
}

function asNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function checkTokenBucket(
  apiKeyId: string,
  config: Pick<RateLimitConfig, 'bucket_capacity' | 'refill_rate' | 'refill_interval_ms'>
): Promise<RateLimitResult> {
  const key = `rl:tb:${apiKeyId}`;
  const now = Date.now();

  const args = [
    String(Math.max(1, config.bucket_capacity)),
    String(Math.max(1, config.refill_rate)),
    String(Math.max(1, config.refill_interval_ms)),
    String(now),
    '1',
  ];

  let sha = await loadScriptSha();

  try {
    const raw = (await redis.evalsha(sha, 1, key, ...args)) as LuaResult;
    const allowed = asNumber(raw?.[0], 0) === 1;
    const remaining = Math.max(0, Math.floor(asNumber(raw?.[1], 0)));
    const retryAfterMs = Math.max(0, asNumber(raw?.[2], 0));

    return {
      allowed,
      remaining,
      retryAfter: retryAfterMs / 1000,
    };
  } catch (err: any) {
    if (err?.message?.includes('NOSCRIPT')) {
      scriptSha = null;
      scriptLoadPromise = null;
      sha = await loadScriptSha();

      const raw = (await redis.evalsha(sha, 1, key, ...args)) as LuaResult;
      const allowed = asNumber(raw?.[0], 0) === 1;
      const remaining = Math.max(0, Math.floor(asNumber(raw?.[1], 0)));
      const retryAfterMs = Math.max(0, asNumber(raw?.[2], 0));

      return {
        allowed,
        remaining,
        retryAfter: retryAfterMs / 1000,
      };
    }

    throw err;
  }
}