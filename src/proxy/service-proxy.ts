import { createProxyMiddleware, type RequestHandler } from 'http-proxy-middleware';
import type { Logger } from '@novachat-enterprise-erp/common';

export const createServiceProxy = (logger: Logger, fallbackTarget: string): RequestHandler =>
  createProxyMiddleware({
    target: fallbackTarget,
    changeOrigin: true,
    xfwd: true,
    router: (req) => req.upstream?.target ?? fallbackTarget,
    proxyTimeout: 30_000,
    on: {
      error: (err, req, res) => {
        logger.error({ err, url: req.url, service: req.upstream?.service }, 'Upstream request failed');
        if (!('writeHead' in res)) return void res.destroy();
        if (res.headersSent) return void res.end();
        res.writeHead(502, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            error: { code: 'BAD_GATEWAY', message: `${req.upstream?.service ?? 'upstream'} service is unavailable` },
          }),
        );
      },
    },
  });
