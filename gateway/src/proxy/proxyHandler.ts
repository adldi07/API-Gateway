import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { Request, Response, NextFunction } from 'express';
import { resolveUpstream } from './routeResolver';

/**
 * Dynamic reverse-proxy middleware.
 * Resolves the upstream target per-request using routeResolver,
 * then proxies the request with path rewriting.
 */
export async function proxyHandler(req: Request, res: Response, next: NextFunction) {
  const resolved = await resolveUpstream(req.path);

  if (!resolved) {
    return res.status(404).json({
      error: 'no_upstream',
      message: `No upstream route configured for path: ${req.path}`,
    });
  }

  const { targetUrl, rewrittenPath } = resolved;

  // Record the start time for latency measurement (used by requestLogger)
  req.startTime = Date.now();
  req.upstreamTarget = targetUrl;

  const proxyOptions: Options = {
    target: targetUrl,
    changeOrigin: true,
    pathRewrite: (path, _req) => {
      if (resolved.route.strip_prefix && path.startsWith(resolved.route.path_prefix)) {
        return path.replace(resolved.route.path_prefix, '') || '/';
      }
      return path;
    },
    selfHandleResponse: false,
    on: {
      proxyReq: (_proxyReq, _req) => {
        // Could add tracing headers here
      },
      error: (err, _req, res) => {
        console.error(`⚠️  Proxy error → ${targetUrl}:`, err.message);
        if ('headersSent' in res && 'status' in res && !res.headersSent) {
          (res as Response).status(502).json({
            error: 'bad_gateway',
            message: 'Upstream service is unavailable',
          });
        }
      },
    },
  };

  const middleware = createProxyMiddleware(proxyOptions);
  middleware(req, res, next);
}
