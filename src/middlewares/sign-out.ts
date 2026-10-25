import type { RequestHandler } from 'express';
import type { SessionResolverService } from '../services/session-resolver.service.js';

export const invalidateSessionOnSignOut =
  (sessions: SessionResolverService): RequestHandler =>
  async (req, _res, next) => {
    if (req.method === 'POST' && req.path === '/api/auth/sign-out') {
      await sessions.invalidate(req.headers.cookie);
    }
    next();
  };
