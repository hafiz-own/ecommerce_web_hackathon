import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        name?: string;
      };
    }
  }
}

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    const decoded = AuthService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid or expired token',
      code: 'TOKEN_INVALID'
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (token) {
      const decoded = AuthService.verifyToken(token);
      req.user = decoded;
    }
    next();
  } catch (error) {
    // Continue without authentication for optional routes
    next();
  }
};

/**
 * Admin authentication middleware (can be extended for role-based access)
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  // First check if user is authenticated
  await authenticateToken(req, res, async (err) => {
    if (err) return next(err);
    
    if (!req.user?.email) {
      return res.status(403).json({
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED'
      });
    }

    const allowlistRaw = process.env.ADMIN_EMAILS || '';
    const allowlist = new Set(
      allowlistRaw
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(Boolean)
    );

    const allowedDomain = (process.env.ADMIN_DOMAIN || '').trim().toLowerCase();
    const email = req.user.email.toLowerCase();

    const allowlisted = allowlist.size > 0 ? allowlist.has(email) : false;
    const domainAllowed = allowedDomain ? email.endsWith(`@${allowedDomain}`) : false;

    if (!allowlisted && !domainAllowed) {
      return res.status(403).json({
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED'
      });
    }

    next();
  });
};
