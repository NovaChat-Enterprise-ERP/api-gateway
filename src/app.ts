import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler, healthRouter, httpLogger, requestId } from '@novachat-enterprise-erp/common';
import type { Container } from './container.js';
import { authenticate } from './middlewares/authenticate.js';
import { rateLimit } from './middlewares/rate-limit.js';
import { invalidateSessionOnSignOut } from './middlewares/sign-out.js';
import { createServiceProxy } from './proxy/service-proxy.js';

export const createApp = (container: Container): Express => {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(requestId());
  app.use(httpLogger(container.logger));
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cors({ origin: container.publicAppUrl, credentials: true }));

  app.use(healthRouter('api-gateway'));
  app.get('/health/services', container.controllers.health.services);

  app.get('/api/v1/realtime/ticket', container.controllers.realtime.ticket);
  app.use(invalidateSessionOnSignOut(container.sessions));
  app.use(authenticate(container.routes, container.auth, container.internalSecret));
  app.use(rateLimit(container.rateLimiter, container.rateLimits));
  app.use(createServiceProxy(container.logger, container.targets.auth));
  app.use(errorHandler(container.logger));
  return app;
};
