import { setTimeout as sleep } from 'node:timers/promises';
import { BATCH_DEFAULTS } from '../../../shared/constants';
import { env } from '../config/env';
import { pool } from '../db/pool';

export interface RequestLogInsert {
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

const queue: RequestLogInsert[] = [];
let intervalHandle: NodeJS.Timeout | null = null;
let flushing = false;

const flushIntervalMs = Math.max(1000, env.BATCH_FLUSH_INTERVAL_MS || BATCH_DEFAULTS.FLUSH_INTERVAL_MS);
const maxBatchSize = Math.max(1, env.BATCH_MAX_SIZE || BATCH_DEFAULTS.MAX_SIZE);
const maxBufferSize = BATCH_DEFAULTS.MAX_BUFFER;

function trimQueueIfNeeded() {
  if (queue.length <= maxBufferSize) {
    return;
  }

  const overflow = queue.length - maxBufferSize;
  queue.splice(0, overflow);
  console.warn(`Dropped ${overflow} old request log entries due to buffer limit (${maxBufferSize})`);
}

function buildInsertQuery(batch: RequestLogInsert[]) {
  const values: Array<string | number | boolean | null | Date> = [];
  const placeholders = batch
    .map((entry, index) => {
      const offset = index * 9;
      values.push(
        entry.api_key_id,
        entry.method,
        entry.path,
        entry.status_code,
        entry.latency_ms,
        entry.ip_address,
        entry.user_agent,
        entry.rate_limited,
        new Date(entry.created_at)
      );

      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`;
    })
    .join(', ');

  return {
    text: `INSERT INTO request_logs (api_key_id, method, path, status_code, latency_ms, ip_address, user_agent, rate_limited, created_at) VALUES ${placeholders}`,
    values,
  };
}

async function insertBatchWithRetry(batch: RequestLogInsert[]) {
  const query = buildInsertQuery(batch);
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await pool.query(query.text, query.values);
      return;
    } catch (error) {
      if (attempt >= maxAttempts) {
        throw error;
      }

      const backoffMs = 1000 * 2 ** (attempt - 1);
      await sleep(backoffMs);
    }
  }
}

export function pushRequestLog(entry: RequestLogInsert) {
  queue.push(entry);
  trimQueueIfNeeded();

  if (queue.length >= maxBatchSize) {
    void flushNow();
  }
}

export async function flushNow() {
  if (flushing || queue.length === 0) {
    return;
  }

  flushing = true;
  const batch = queue.splice(0, maxBatchSize);

  try {
    await insertBatchWithRetry(batch);
  } catch (error) {
    console.error('Failed to flush request log batch:', error);

    queue.unshift(...batch);
    trimQueueIfNeeded();
  } finally {
    flushing = false;

    if (queue.length >= maxBatchSize) {
      void flushNow();
    }
  }
}

export function startBatchWriter() {
  if (intervalHandle) {
    return;
  }

  intervalHandle = setInterval(() => {
    void flushNow();
  }, flushIntervalMs);

  intervalHandle.unref?.();
}

export function stopBatchWriter() {
  if (!intervalHandle) {
    return;
  }

  clearInterval(intervalHandle);
  intervalHandle = null;
}
