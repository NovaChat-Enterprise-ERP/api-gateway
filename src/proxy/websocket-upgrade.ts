import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { stripInternalHeaders, type Logger } from '@novachat-enterprise-erp/common';
import type { RouteResolver } from '../services/route-resolver.js';
import type { GatewayAuthService } from '../services/gateway-auth.service.js';
import { applyInternalHeaders } from '../middlewares/authenticate.js';

export const createUpgradeHandler = (
  routes: RouteResolver,
  auth: GatewayAuthService,
  secret: string,
  logger: Logger,
) => {
  const proxies = new Map<string, ReturnType<typeof createProxyMiddleware>>();
  const proxyFor = (target: string) => {
    let proxy = proxies.get(target);
    if (!proxy) {
      proxy = createProxyMiddleware({ target, changeOrigin: true, ws: true, xfwd: true });
      proxies.set(target, proxy);
    }
    return proxy;
  };

  return async (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    stripInternalHeaders(req.headers);
    const url = new URL(req.url ?? '/', 'http://gateway');
    const route = routes.resolve(url.pathname);
    if (!route || route.service !== 'realtime') return socket.destroy();
    try {
      const context = await auth.authenticateSocket(route, req.headers.cookie, url.searchParams.get('ticket'));
      applyInternalHeaders(req, context, secret);
      proxyFor(route.target).upgrade(req, socket as never, head);
    } catch (error) {
      logger.warn({ err: error }, 'Rejected websocket upgrade');
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
      socket.destroy();
    }
  };
};
