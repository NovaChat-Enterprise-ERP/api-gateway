import type { IncomingMessage } from 'node:http';
import type { RequestHandler } from 'express';
import { NotFoundError, signInternalContext, stripInternalHeaders } from '@novachat-enterprise-erp/common';
import type { AuthContext } from '@novachat-enterprise-erp/contracts';
import type { RouteResolver, ResolvedRoute } from '../services/route-resolver.js';
import type { GatewayAuthService } from '../services/gateway-auth.service.js';

declare module 'node:http' {
  interface IncomingMessage {
    upstream?: ResolvedRoute;
  }
}

export const applyInternalHeaders = (req: IncomingMessage, context: AuthContext, secret: string): void => {
  stripInternalHeaders(req.headers);
  Object.assign(req.headers, signInternalContext(context, secret));
};

export const authenticate =
  (routes: RouteResolver, auth: GatewayAuthService, secret: string): RequestHandler =>
  async (req, _res, next) => {
    stripInternalHeaders(req.headers);
    const route = routes.resolve(req.path);
    if (!route) return next(new NotFoundError(`Route ${req.method} ${req.path}`));
    req.upstream = route;
    const context = await auth.authenticate(route, req.headers.cookie, req.requestId);
    req.auth = context;
    applyInternalHeaders(req, context, secret);
    next();
  };
