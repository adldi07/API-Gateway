import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { GATEWAY_REQUEST_ID_HEADER } from '../../../shared/constants';

/**
 * Assigns a unique X-Gateway-Request-Id to every incoming request.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const id = uuidv4();
  req.gatewayRequestId = id;
  res.setHeader(GATEWAY_REQUEST_ID_HEADER, id);
  next();
}
