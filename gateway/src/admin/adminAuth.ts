import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * Guard for admin endpoints — validates Authorization: Bearer <ADMIN_SECRET>.
 */
export function adminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'missing_auth',
      message: 'Provide admin token via Authorization: Bearer <token>',
    });
  }

  const token = authHeader.slice(7);
  if (token !== env.ADMIN_SECRET) {
    return res.status(403).json({
      error: 'forbidden',
      message: 'Invalid admin token',
    });
  }

  next();
}
