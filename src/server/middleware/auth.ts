import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_for_urban_threads_production_grade_security_2026!';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: 'customer' | 'admin';
  fullName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function generateToken(user: AuthenticatedUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Missing or malformed Authorization header with Bearer token.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Invalid or expired token',
      message: 'Please log in again to continue.',
    });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in to access this resource.',
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied: Administrator privileges are required to perform this action.',
    });
  }

  next();
}

export function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
      req.user = decoded;
    } catch {
      // Ignore invalid token for optional endpoints
    }
  }

  next();
}

