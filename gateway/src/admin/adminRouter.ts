import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/pool';
import { adminAuth } from './adminAuth';
import { invalidateRouteCache } from '../proxy/routeResolver';
import { sseEventsHandler } from '../analytics/realtimeBroadcast';

const router = Router();

// All admin routes require admin auth
router.use(adminAuth);

// ──────────────────────────────────────────────────────────────────────
// API Keys CRUD
// ──────────────────────────────────────────────────────────────────────

router.get('/api-keys', async (_req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(_req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(_req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT ak.*, rl.algorithm, rl.bucket_capacity, rl.refill_rate, 
                rl.refill_interval_ms, rl.window_size_ms, rl.max_requests
         FROM api_keys ak
         LEFT JOIN rate_limit_configs rl ON rl.api_key_id = ak.id
         ORDER BY ak.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query('SELECT COUNT(*) FROM api_keys'),
    ]);

    res.json({ data: dataResult.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error('Admin: GET /api-keys error:', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.post('/api-keys', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'validation', message: 'name is required' });
    }

    const keyValue = `gw_${uuidv4().replace(/-/g, '')}`;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: keyRows } = await client.query(
        `INSERT INTO api_keys (key_value, name) VALUES ($1, $2) RETURNING *`,
        [keyValue, name]
      );

      // Create default rate limit config for the new key
      await client.query(
        `INSERT INTO rate_limit_configs (api_key_id) VALUES ($1)`,
        [keyRows[0].id]
      );

      await client.query('COMMIT');
      res.status(201).json({ data: keyRows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Admin: POST /api-keys error:', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.patch('/api-keys/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, is_active } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'validation', message: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await pool.query(
      `UPDATE api_keys SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('Admin: PATCH /api-keys error:', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.delete('/api-keys/:id', async (req: Request, res: Response) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM api_keys WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'not_found' });
    res.status(204).send();
  } catch (err) {
    console.error('Admin: DELETE /api-keys error:', err);
    res.status(500).json({ error: 'internal' });
  }
});

// ──────────────────────────────────────────────────────────────────────
// Rate Limit Configs
// ──────────────────────────────────────────────────────────────────────

router.get('/rate-limits/:apiKeyId', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM rate_limit_configs WHERE api_key_id = $1',
      [req.params.apiKeyId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'not_found' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('Admin: GET /rate-limits error:', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.put('/rate-limits/:apiKeyId', async (req: Request, res: Response) => {
  try {
    const { apiKeyId } = req.params;
    const { algorithm, bucket_capacity, refill_rate, refill_interval_ms, window_size_ms, max_requests } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO rate_limit_configs (api_key_id, algorithm, bucket_capacity, refill_rate, refill_interval_ms, window_size_ms, max_requests)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (api_key_id) DO UPDATE SET
         algorithm = EXCLUDED.algorithm,
         bucket_capacity = EXCLUDED.bucket_capacity,
         refill_rate = EXCLUDED.refill_rate,
         refill_interval_ms = EXCLUDED.refill_interval_ms,
         window_size_ms = EXCLUDED.window_size_ms,
         max_requests = EXCLUDED.max_requests,
         updated_at = NOW()
       RETURNING *`,
      [apiKeyId, algorithm || 'token_bucket', bucket_capacity || 100, refill_rate || 10, refill_interval_ms || 1000, window_size_ms || 60000, max_requests || 100]
    );

    res.json({ data: rows[0] });
  } catch (err) {
    console.error('Admin: PUT /rate-limits error:', err);
    res.status(500).json({ error: 'internal' });
  }
});

// ──────────────────────────────────────────────────────────────────────
// Upstream Routes
// ──────────────────────────────────────────────────────────────────────

router.get('/routes', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM upstream_routes ORDER BY created_at DESC');
    res.json({ data: rows });
  } catch (err) {
    console.error('Admin: GET /routes error:', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.post('/routes', async (req: Request, res: Response) => {
  try {
    const { path_prefix, target_url, strip_prefix = true } = req.body;
    if (!path_prefix || !target_url) {
      return res.status(400).json({ error: 'validation', message: 'path_prefix and target_url are required' });
    }

    const { rows } = await pool.query(
      `INSERT INTO upstream_routes (path_prefix, target_url, strip_prefix) VALUES ($1, $2, $3) RETURNING *`,
      [path_prefix, target_url, strip_prefix]
    );

    await invalidateRouteCache();
    res.status(201).json({ data: rows[0] });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'conflict', message: 'path_prefix already exists' });
    }
    console.error('Admin: POST /routes error:', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.delete('/routes/:id', async (req: Request, res: Response) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM upstream_routes WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'not_found' });
    await invalidateRouteCache();
    res.status(204).send();
  } catch (err) {
    console.error('Admin: DELETE /routes error:', err);
    res.status(500).json({ error: 'internal' });
  }
});

// ──────────────────────────────────────────────────────────────────────
// Realtime Events (SSE)
// ──────────────────────────────────────────────────────────────────────

router.get('/events', sseEventsHandler);

// ──────────────────────────────────────────────────────────────────────
// Analytics (summary + log listing)
// ──────────────────────────────────────────────────────────────────────

router.get('/analytics/summary', async (req: Request, res: Response) => {
  try {
    const from = req.query.from as string || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const to = req.query.to as string || new Date().toISOString();
    const apiKeyId = req.query.apiKeyId as string | undefined;

    let whereClause = 'WHERE created_at >= $1 AND created_at <= $2';
    const params: any[] = [from, to];

    if (apiKeyId) {
      whereClause += ' AND api_key_id = $3';
      params.push(apiKeyId);
    }

    const { rows } = await pool.query(
      `SELECT 
         COUNT(*)::int AS "totalRequests",
         COALESCE(AVG(latency_ms), 0)::float AS "avgLatency",
         COALESCE(SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0), 0) AS "errorRate"
       FROM request_logs ${whereClause}`,
      params
    );

    const topPathsResult = await pool.query(
      `SELECT path, COUNT(*)::int AS count 
       FROM request_logs ${whereClause}
       GROUP BY path ORDER BY count DESC LIMIT 10`,
      params
    );

    res.json({
      ...rows[0],
      topPaths: topPathsResult.rows,
    });
  } catch (err) {
    console.error('Admin: GET /analytics/summary error:', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.get('/analytics/logs', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIdx = 1;

    if (req.query.status) {
      whereClause += ` AND status_code = $${paramIdx++}`;
      params.push(parseInt(req.query.status as string));
    }
    if (req.query.path) {
      whereClause += ` AND path LIKE $${paramIdx++}`;
      params.push(`%${req.query.path}%`);
    }
    if (req.query.apiKeyId) {
      whereClause += ` AND api_key_id = $${paramIdx++}`;
      params.push(req.query.apiKeyId);
    }

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT * FROM request_logs ${whereClause} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
        [...params, limit, offset]
      ),
      pool.query(`SELECT COUNT(*)::int AS count FROM request_logs ${whereClause}`, params),
    ]);

    res.json({ data: dataResult.rows, total: countResult.rows[0].count });
  } catch (err) {
    console.error('Admin: GET /analytics/logs error:', err);
    res.status(500).json({ error: 'internal' });
  }
});

export default router;
