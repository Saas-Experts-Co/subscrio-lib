import { Request, Response, NextFunction } from 'express';
import { Subscrio } from '@subscrio/core';
import jwt from 'jsonwebtoken';

/**
 * Dual Authentication Middleware
 * 
 * Accepts EITHER:
 * 1. API Key via X-API-Key header (for external integrations)
 * 2. JWT token via Authorization: Bearer header (for admin UI)
 * 
 * External apps should use API keys.
 * Admin UI should use JWT tokens obtained via /api/auth/login.
 */
export function createAuthMiddleware(subscrio: Subscrio) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string;
    const authHeader = req.headers.authorization as string;
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    // Must provide one authentication method
    if (!apiKey && !token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required. Provide X-API-Key or Authorization Bearer token.'
      });
    }

    // Try API Key authentication first
    if (apiKey) {
      try {
        await subscrio.apiKeys.validateAPIKey(apiKey);
        return next(); // Valid API key - proceed
      } catch (error: any) {
        // API key validation failed
        if (error.message.includes('expired')) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'API key has expired'
          });
        }
        if (error.message.includes('revoked')) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'API key has been revoked'
          });
        }
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid API key'
        });
      }
    }

    // Try JWT authentication
    if (token) {
      try {
        const jwtSecret = process.env.JWT_SECRET || 'change-me-in-production';
        jwt.verify(token, jwtSecret);
        return next(); // Valid JWT - proceed
      } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Token has expired. Please login again.'
          });
        }
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or malformed token'
        });
      }
    }

    // Should never reach here
    return res.status(401).json({ error: 'Unauthorized' });
  };
}

// Keep old name for backwards compatibility
export const createApiKeyMiddleware = createAuthMiddleware;

