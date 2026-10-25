import type { RequestHandler } from 'express';
import { TooManyRequestsError } from '@novachat-enterprise-erp/common';
import type { RateLimiter } from '@novachat-enterprise-erp/cache';

export interface RateLimitOptions {
  perMinute: number;
  authPerMinute: number;
}

export const rateLimit =
  (limiter: RateLimiter, options: RateLimitOptions): RequestHandler =>
  async (req, res, next) => {
    const isAuthRoute = req.path.startsWith('/api/auth/') && req.method !== 'GET';
    const identity = req.auth?.userId ? `user:${req.auth.userId}` : `ip:${req.ip}`;
    const limit = isAuthRoute ? options.authPerMinute : options.perMinute;
    const result = await limiter.consume(`${isAuthRoute ? 'auth' : 'api'}:${identity}`, limit, 60);
    res.setHeader('RateLimit-Limit', limit);
    res.setHeader('RateLimit-Remaining', result.remaining);
    res.setHeader('RateLimit-Reset', result.resetSeconds);
    if (!result.allowed) {
      res.setHeader('Retry-After', result.resetSeconds);
      return next(new TooManyRequestsError());
    }
    next();
  };
