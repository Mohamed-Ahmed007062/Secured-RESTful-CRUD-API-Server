import { Request, Response, NextFunction } from 'express';

export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Clickjacking protection
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Legacy XSS filter activation
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // HTTP Strict Transport Security
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Disable Flash/PDF cross-domain content
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  // Hide Express server technology signature
  res.removeHeader('X-Powered-By');

  next();
}
