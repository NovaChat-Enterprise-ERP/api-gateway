import type { RateLimiter, KeyValueCache } from '@novachat-enterprise-erp/cache';
import { InternalHttpClient, type Logger } from '@novachat-enterprise-erp/common';
import { ROUTE_RULES, type ServiceName } from './config/routes.js';
import { RouteResolver } from './services/route-resolver.js';
import { SessionResolverService } from './services/session-resolver.service.js';
import { WorkspaceAccessService } from './services/workspace-access.service.js';
import { GatewayAuthService } from './services/gateway-auth.service.js';
import { HealthController } from './controllers/health.controller.js';
import { RealtimeController } from './controllers/realtime.controller.js';
import { RealtimeTicketService } from './services/realtime-ticket.service.js';

export interface ContainerDeps {
  logger: Logger;
  internalSecret: string;
  publicAppUrl: string;
  targets: Record<ServiceName, string>;
  cache: KeyValueCache;
  rateLimiter: RateLimiter;
  rateLimits: { perMinute: number; authPerMinute: number };
}

export const buildContainer = (deps: ContainerDeps) => {
  const client = (service: ServiceName) =>
    new InternalHttpClient(deps.targets[service], deps.internalSecret, 'api-gateway');

  const routes = new RouteResolver(ROUTE_RULES, deps.targets);
  const sessions = new SessionResolverService(deps.cache, client('auth'));
  const access = new WorkspaceAccessService(deps.cache, client('workspace'));
  const tickets = new RealtimeTicketService(deps.internalSecret);
  const auth = new GatewayAuthService(sessions, access, tickets);

  return {
    ...deps,
    routes,
    sessions,
    access,
    auth,
    tickets,
    controllers: {
      health: new HealthController(deps.targets),
      realtime: new RealtimeController(sessions, tickets),
    },
  };
};

export type Container = ReturnType<typeof buildContainer>;
