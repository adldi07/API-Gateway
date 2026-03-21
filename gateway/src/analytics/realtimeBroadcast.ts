import { Request, Response } from 'express';
import { RequestEvent } from '../../../shared/types';

const clients = new Set<Response>();
const heartbeatIntervalMs = 15_000;

function writeEvent(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function broadcastRequestEvent(event: RequestEvent) {
  for (const client of clients) {
    writeEvent(client, 'request', event);
  }
}

export function broadcastRateLimitEvent(event: {
  apiKeyId: string;
  algorithm: 'token_bucket' | 'sliding_window';
  remaining: number;
  retryAfter: number;
}) {
  for (const client of clients) {
    writeEvent(client, 'rate_limit', event);
  }
}

setInterval(() => {
  const payload = { ts: new Date().toISOString() };

  for (const client of clients) {
    writeEvent(client, 'heartbeat', payload);
  }
}, heartbeatIntervalMs).unref?.();

export function sseEventsHandler(_req: Request, res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  writeEvent(res, 'connected', { ts: new Date().toISOString() });
  clients.add(res);

  _req.on('close', () => {
    clients.delete(res);
  });
}
