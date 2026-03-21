import { pool } from '../db/pool';
import { UpstreamRoute } from '../../../shared/types';

/**
 * In-memory cache of upstream routes, refreshed periodically.
 */
let routes: UpstreamRoute[] = [];
let lastRefresh = 0;
const REFRESH_INTERVAL = 30_000; // 30 seconds

async function refreshRoutes(): Promise<void> {
  const { rows } = await pool.query<UpstreamRoute>(
    `SELECT id, path_prefix, target_url, strip_prefix, is_active, created_at 
     FROM upstream_routes 
     WHERE is_active = true 
     ORDER BY LENGTH(path_prefix) DESC` // longest prefix first for matching
  );
  routes = rows;
  lastRefresh = Date.now();
  console.log(`🔄 Refreshed ${routes.length} upstream route(s)`);
}

/**
 * Resolves an incoming request path to an upstream target URL.
 * Returns { route, targetUrl, rewrittenPath } or null if no match.
 */
export async function resolveUpstream(
  reqPath: string
): Promise<{ route: UpstreamRoute; targetUrl: string; rewrittenPath: string } | null> {
  if (Date.now() - lastRefresh > REFRESH_INTERVAL) {
    await refreshRoutes();
  }

  for (const route of routes) {
    if (reqPath.startsWith(route.path_prefix)) {
      const rewrittenPath = route.strip_prefix
        ? reqPath.slice(route.path_prefix.length) || '/'
        : reqPath;

      return {
        route,
        targetUrl: route.target_url,
        rewrittenPath,
      };
    }
  }
  return null;
}

/**
 * Force-refresh the route cache (called after admin CRUD).
 */
export async function invalidateRouteCache(): Promise<void> {
  lastRefresh = 0;
}
