import { Request, Response, NextFunction } from 'express';

/**
 * Global Error Handler Middleware
 * 
 * Catches all errors thrown by route handlers and:
 * 1. Maps error types to appropriate HTTP status codes
 * 2. Sanitizes error messages for production (no SQL queries, stack traces)
 * 3. Logs detailed errors server-side
 * 4. Returns consistent JSON error responses
 * 
 * Must be registered AFTER all routes.
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log detailed error server-side (always log, even in production)
  const timestamp = new Date().toISOString();
  const requestInfo = `${req.method} ${req.path}`;
  
  console.error(`[${timestamp}] ERROR in ${requestInfo}:`, {
    name: err.name,
    message: err.message,
    stack: err.stack,
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Check if this is a database/query error (contains SQL)
  const errorMsg = (err.message || '').toLowerCase();
  const errorName = (err.name || '').toLowerCase();
  
  const isDatabaseError = 
    errorMsg.includes('failed query') ||
    errorMsg.includes('select ') ||
    errorMsg.includes('select"') ||
    errorMsg.includes('insert ') ||
    errorMsg.includes('insert"') ||
    errorMsg.includes('update ') ||
    errorMsg.includes('update"') ||
    errorMsg.includes('delete ') ||
    errorMsg.includes('delete"') ||
    errorMsg.includes('from "') ||
    errorMsg.includes('from"') ||
    errorMsg.includes('where ') ||
    errorMsg.includes('where"') ||
    errorMsg.includes('params:') ||
    errorMsg.includes('query:') ||
    errorName.includes('postgres') ||
    errorName.includes('database') ||
    errorName.includes('sql');

  // If database error detected, sanitize immediately
  if (isDatabaseError) {
    console.error(`⚠️  DATABASE ERROR SANITIZED - check server logs for details`);
    return res.status(500).json({
      error: 'Database Error',
      message: process.env.NODE_ENV === 'production'
        ? 'A database error occurred. Please contact support.'
        : 'Database query failed - check server logs for details'
    });
  }

  // Default error response
  let statusCode = 500;
  let errorResponse: any = {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  };

  // Map custom error types to HTTP status codes
  switch (err.name) {
    case 'ValidationError':
      statusCode = 400;
      errorResponse = {
        error: 'Validation Error',
        message: err.message || 'Invalid input data',
        ...(err.errors && { errors: err.errors }) // Include Zod validation details
      };
      break;

    case 'NotFoundError':
      statusCode = 404;
      errorResponse = {
        error: 'Not Found',
        message: err.message || 'Resource not found'
      };
      break;

    case 'ConflictError':
      statusCode = 409;
      errorResponse = {
        error: 'Conflict',
        message: err.message || 'Resource already exists'
      };
      break;

    case 'AuthError':
      statusCode = 401;
      errorResponse = {
        error: 'Unauthorized',
        message: err.message || 'Authentication failed'
      };
      break;

    case 'DomainError':
      statusCode = 422;
      errorResponse = {
        error: 'Business Rule Violation',
        message: err.message || 'Operation violates business rules'
      };
      break;

    case 'ConfigurationError':
      statusCode = 500;
      errorResponse = {
        error: 'Configuration Error',
        message: process.env.NODE_ENV === 'production' 
          ? 'Server configuration error' 
          : err.message
      };
      break;

    default:
      // Unknown error type - sanitize in production
      if (process.env.NODE_ENV === 'production') {
        // Don't leak internal details in production
        errorResponse = {
          error: 'Internal Server Error',
          message: 'An unexpected error occurred. Please contact support.'
        };
      } else {
        // In development, show more details
        errorResponse = {
          error: err.name || 'Error',
          message: err.message || 'Unknown error',
          stack: err.stack
        };
      }
  }

  // Send response
  res.status(statusCode).json(errorResponse);
}

/**
 * Async Handler Wrapper
 * 
 * Express doesn't catch errors from async functions by default.
 * This wrapper ensures async errors are passed to the error handler.
 * 
 * Usage: app.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

