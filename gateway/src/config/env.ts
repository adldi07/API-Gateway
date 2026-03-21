import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ADMIN_SECRET: z.string().min(16),

  // PostgreSQL
  PG_HOST: z.string().default('localhost'),
  PG_PORT: z.coerce.number().default(5432),
  PG_USER: z.string().default('gateway'),
  PG_PASSWORD: z.string(),
  PG_DATABASE: z.string().default('api_gateway'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_FAIL_MODE: z.enum(['open', 'closed']).default('open'),

  // Batch writer
  BATCH_FLUSH_INTERVAL_MS: z.coerce.number().default(5000),
  BATCH_MAX_SIZE: z.coerce.number().default(100),

  // Fallback upstream
  DEFAULT_UPSTREAM_URL: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
