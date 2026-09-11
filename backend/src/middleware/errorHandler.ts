import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  console.error('Unhandled API Error:', err);
  const statusCode = err.statusCode || err.status || 500;
  
  // Return generic error for unexpected 500s to avoid leaking internals
  const message = statusCode >= 500 ? 'Internal server error' : (err.message || 'Request failed');

  res.status(statusCode).json({ message });
}
