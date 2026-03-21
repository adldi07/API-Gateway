import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/pool';
import { API_KEY_HEADER } from '../../../shared/constants';
import { ApiKey, RateLimitConfig } from '../../../shared/types';

/**
 * Extracts and validates the x-api-key header.
 * Attaches `req.apiKey` and `req.rateLimitConfig` on success.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const keyValue = req.headers[API_KEY_HEADER] as string | undefined;

  if (!keyValue) {
    return res.status(401).json({
      error: 'missing_api_key',
      message: `Provide your API key via the ${API_KEY_HEADER} header`,
    });
  }

  try {
    const { rows } = await pool.query<ApiKey & RateLimitConfig>(
      `SELECT 
         ak.id, ak.key_value, ak.name, ak.is_active,
         rl.algorithm, rl.bucket_capacity, rl.refill_rate, rl.refill_interval_ms,
         rl.window_size_ms, rl.max_requests
       FROM api_keys ak
       LEFT JOIN rate_limit_configs rl ON rl.api_key_id = ak.id
       WHERE ak.key_value = $1`,
      [keyValue]
    );

    if (rows.length === 0 || !rows[0].is_active) {
      return res.status(403).json({
        error: 'invalid_api_key',
        message: 'API key is invalid or has been revoked',
      });
    }

    const row = rows[0];
    req.apiKey = {
      id: row.id,
      key_value: row.key_value,
      name: row.name,
      is_active: row.is_active,
      created_at: '',
      updated_at: '',
    };
    req.rateLimitConfig = row.algorithm
      ? {
          id: '',
          api_key_id: row.id,
          algorithm: row.algorithm,
          bucket_capacity: row.bucket_capacity,
          refill_rate: row.refill_rate,
          refill_interval_ms: row.refill_interval_ms,
          window_size_ms: row.window_size_ms,
          max_requests: row.max_requests,
          created_at: '',
          updated_at: '',
        }
      : undefined;

    next();
  } catch (err) {
    console.error('⚠️  Auth lookup failed:', err);
    return res.status(500).json({ error: 'internal', message: 'Authentication service error' });
  }
}
