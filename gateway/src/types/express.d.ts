import { ApiKey, RateLimitConfig } from '../../../shared/types';

declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKey;
      rateLimitConfig?: RateLimitConfig;
      startTime?: number;
      upstreamTarget?: string;
      gatewayRequestId?: string;
    }
  }
}
